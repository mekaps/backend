const express = require("express");
const { addProduct, getProducts, getProductById, deleteProduct } = require("../controllers/productController");

const router = express.Router();
const multer = require("multer");

// 📌 ตั้งค่า multer สำหรับอัพโหลดรูปภาพ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.single("image"), addProduct); // ✅ เพิ่มสินค้า
router.get("/", getProducts); // ✅ ดึงสินค้าทั้งหมด
router.get("/:id", getProductById); // ✅ ดึงสินค้าตาม ID
router.delete("/:id", deleteProduct); // ✅ ลบสินค้า

module.exports = router;
