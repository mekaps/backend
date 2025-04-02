const Product = require("../models/Product");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "uploads/"); // เก็บรูปไว้ในโฟลเดอร์ `uploads/`
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname); // ตั้งชื่อไฟล์ให้ไม่ซ้ำ
    },
});

const upload = multer({ storage: storage });

// ✅ เพิ่มสินค้าใหม่
exports.addProduct = async(req, res) => {
    try {
        const { name, price } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null; // เก็บ path รูปภาพ

        const product = new Product({ name, price, quantity, image });
        await product.save();
        res.json({ message: "✅ Product added!", product });
    } catch (error) {
        res.status(500).json({ message: "❌ Error adding product" });
    }
};

// ✅ ดึงสินค้าทั้งหมด
exports.getProducts = async(req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "❌ Error fetching products" });
    }
};

// ดึงสินค้าตาม ID
exports.getProductById = async(req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "❌ ไม่พบสินค้า" });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการดึงสินค้า" });
    }
};


// ✅ ลบสินค้า
exports.deleteProduct = async(req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "✅ Product deleted!" });
    } catch (error) {
        res.status(500).json({ message: "❌ Error deleting product" });
    }
};