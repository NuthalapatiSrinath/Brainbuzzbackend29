const Banner = require("../../models/Banner");
const cloudinary = require("../../config/cloudinary");

// Helper: Upload
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(fileBuffer);
  });
};

// Helper: Delete from Cloudinary
const deleteFromCloudinary = async (public_id) => {
  if (!public_id) return;
  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

// ==========================================
// 1. Upsert (Create/Update Text, Styles, Cards)
// ==========================================
exports.upsertBanner = async (req, res) => {
  try {
    const {
      pageType,
      heading,
      description,
      secondaryTitle,
      featureCards,
      styleConfig,
    } = req.body;

    if (!pageType)
      return res
        .status(400)
        .json({ success: false, message: "Page type required" });

    // Prepare Update Data
    const updateData = { pageType, isActive: true };

    // Update simple text fields
    if (heading !== undefined) updateData.heading = heading;
    if (description !== undefined) updateData.description = description;
    if (secondaryTitle !== undefined)
      updateData.secondaryTitle = secondaryTitle;

    // Parse Complex JSON fields (Feature Cards & Styles)
    if (featureCards) {
      try {
        updateData.featureCards = JSON.parse(featureCards);
      } catch (e) {
        console.error("JSON Parse Error (Cards):", e);
      }
    }

    if (styleConfig) {
      try {
        updateData.styleConfig = JSON.parse(styleConfig);
      } catch (e) {
        console.error("JSON Parse Error (Styles):", e);
      }
    }

    // Handle Image REPLACEMENT (If "replace all" is desired via this route)
    // Note: Usually we use the specific add/delete routes below for clearer logic,
    // but if files are sent here, we assume a full overwrite of images.
    if (req.files && req.files.images && req.files.images.length > 0) {
      const uploadPromises = req.files.images.map((image) =>
        uploadToCloudinary(
          image.buffer,
          `brainbuzz/banners/${pageType.toLowerCase()}`,
        ),
      );
      const results = await Promise.all(uploadPromises);
      updateData.images = results.map((r, i) => ({
        _id: `${Date.now()}-${i}`,
        id: r.public_id,
        url: r.secure_url,
      }));
    }

    const banner = await Banner.findOneAndUpdate({ pageType }, updateData, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    res.json({ success: true, message: "Banner saved", data: banner });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. Add Images (Append to existing)
// ==========================================
exports.addBannerImages = async (req, res) => {
  try {
    const { pageType } = req.body; // or req.params depending on route setup

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No images uploaded" });
    }

    const banner = await Banner.findOne({ pageType });
    if (!banner)
      return res.status(404).json({
        success: false,
        message: "Banner not found. Create it first.",
      });

    // Upload
    const uploadPromises = req.files.map((image) =>
      uploadToCloudinary(
        image.buffer,
        `brainbuzz/banners/${pageType.toLowerCase()}`,
      ),
    );
    const results = await Promise.all(uploadPromises);

    const newImages = results.map((r, i) => ({
      _id: `${Date.now()}-${Math.random()}`,
      id: r.public_id,
      url: r.secure_url,
    }));

    // Push to array
    banner.images.push(...newImages);
    await banner.save();

    res.json({ success: true, message: "Images added", data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. Delete Specific Image
// ==========================================
exports.deleteBannerImage = async (req, res) => {
  try {
    const { pageType, imageId } = req.params;

    const banner = await Banner.findOne({ pageType });
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });

    // Find image to get public_id
    const image = banner.images.find((img) => img._id === imageId);
    if (!image)
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });

    // Delete from cloud
    await deleteFromCloudinary(image.id);

    // Remove from array
    banner.images = banner.images.filter((img) => img._id !== imageId);
    await banner.save();

    res.json({ success: true, message: "Image deleted", data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. Update Specific Image (Replace Single)
// ==========================================
exports.updateBannerImage = async (req, res) => {
  try {
    const { pageType, imageId } = req.params;
    if (!req.file)
      return res.status(400).json({ success: false, message: "File required" });

    const banner = await Banner.findOne({ pageType });
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });

    const index = banner.images.findIndex((img) => img._id === imageId);
    if (index === -1)
      return res
        .status(404)
        .json({ success: false, message: "Image ID not found" });

    // Delete old
    await deleteFromCloudinary(banner.images[index].id);

    // Upload new
    const result = await uploadToCloudinary(
      req.file.buffer,
      `brainbuzz/banners/${pageType.toLowerCase()}`,
    );

    // Update entry
    banner.images[index].url = result.secure_url;
    banner.images[index].id = result.public_id;
    await banner.save();

    res.json({ success: true, message: "Image replaced", data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. Get Banner
// ==========================================
exports.getBanner = async (req, res) => {
  try {
    const { pageType } = req.params;
    const banner = await Banner.findOne({ pageType });
    if (!banner)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 6. Delete Entire Banner
// ==========================================
exports.deleteBanner = async (req, res) => {
  try {
    const { pageType } = req.params;
    const banner = await Banner.findOneAndDelete({ pageType });
    if (!banner)
      return res.status(404).json({ success: false, message: "Not found" });

    // Cleanup images
    if (banner.images && banner.images.length > 0) {
      banner.images.forEach((img) => deleteFromCloudinary(img.id));
    }

    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
