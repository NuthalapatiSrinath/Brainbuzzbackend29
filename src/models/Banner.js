const mongoose = require("mongoose");

// Schema for the "Feature Cards" (the boxes at the bottom)
const featureCardSchema = new mongoose.Schema({
  icon: { type: String, required: true }, // e.g., "Book", "Video"
  title: { type: String, required: true },
  description: { type: String, required: true },
  color: { type: String, default: "#FCA5A5" }, // Dynamic Card Background Color
});

const bannerSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      enum: ["HOME", "ABOUT"],
      required: true,
      unique: true,
    },
    // Images Array (Used for Home Banner OR About Top Grid)
    images: [
      {
        _id: { type: String, required: true },
        id: { type: String, required: true }, // Cloudinary Public ID
        url: { type: String, required: true },
      },
    ],

    // --- TEXT CONTENT ---
    // reused for "Welcome to Brain Buzz..." (About) or Hero Title (Home)
    heading: { type: String, trim: true },
    // reused for Main Paragraph (About) or Hero Description (Home)
    description: { type: String, trim: true },

    // --- ABOUT PAGE SPECIFIC ---
    secondaryTitle: { type: String, trim: true }, // "Everything you need to know"
    featureCards: [featureCardSchema], // The array of boxes

    // --- DYNAMIC STYLES ---
    styleConfig: {
      headingColor: { type: String, default: "#1e293b" },
      descriptionColor: { type: String, default: "#475569" },
      secondaryTitleColor: { type: String, default: "#1e293b" }, // Color for "Everything you need..."
      overlayColor: { type: String, default: "#000000" },
      overlayOpacity: { type: Number, default: 0 },
      textAlign: {
        type: String,
        enum: ["left", "center", "right"],
        default: "left",
      },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Banner", bannerSchema);
