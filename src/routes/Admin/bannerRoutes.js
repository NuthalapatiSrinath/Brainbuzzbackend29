const express = require("express");
const router = express.Router();
const bannerController = require("../../controllers/Admin/bannerController");
const uploadMiddleware = require("../../middlewares/uploadMiddleware");

// 1. Get Banner
router.get("/:pageType", bannerController.getBanner);

// 2. Upsert (Create/Update Text, Styles, Cards - can also replace all images)
router.post(
  "/",
  uploadMiddleware.fields([{ name: "images", maxCount: 10 }]),
  bannerController.upsertBanner,
);

// 3. Add Images (Append to existing set)
router.post(
  "/add-images",
  uploadMiddleware.array("images", 10),
  bannerController.addBannerImages,
);

// 4. Update Single Image (Replace one specific image)
router.put(
  "/:pageType/images/:imageId",
  uploadMiddleware.single("image"),
  bannerController.updateBannerImage,
);

// 5. Delete Single Image
router.delete("/:pageType/images/:imageId", bannerController.deleteBannerImage);

// 6. Delete Entire Banner
router.delete("/:pageType", bannerController.deleteBanner);

module.exports = router;
