const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const { login, register, addAddress, updateUserProfile, getUserProfile, getUserAddresses } = require("../controllers/authController");
const User = require('../models/User'); // สมมุติว่าคุณใช้ MongoDB และมีโมเดล User
const Product = require('../models/Product');

// สมมุติว่าเส้นทางนี้ใช้เพื่อดึงข้อมูลผู้ใช้ตามอีเมล
router.get('/user/:email', async(req, res) => {
    try {
        const email = req.params.email; // รับอีเมลจาก URL
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "❌ User not found" });
        }

        // ถ้าพบผู้ใช้ ให้ส่งข้อมูลของผู้ใช้กลับมา
        res.json({
            name: user.name,
            email: user.email,
            cart: user.cart || [],
            phoneNumber: user.phoneNumber || "",
        });
    } catch (error) {
        console.error("❌ Error fetching user:", error);
        res.status(500).json({ message: "❌ Server Error" });
    }
});

router.post('/check-email', async(req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user) {
            return res.status(200).json({ exists: true });
        } else {
            return res.status(200).json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking email:', error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล' });
    }
});

router.post('/update', async(req, res) => {
    const { email, newEmail, phone, name } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอีเมลเดิมในฐานข้อมูล
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้ที่มีอีเมลนี้" });
    }

    // อัปเดตข้อมูลของผู้ใช้
    user.email = newEmail || user.email;
    user.phone = phone || user.phone;
    user.name = name || user.name;

    await user.save();

    return res.status(200).json({ message: "ข้อมูลโปรไฟล์ของคุณถูกบันทึกแล้ว" });
});

router.post("/verify-email", async(req, res) => {
    const { email } = req.body;

    try {
        // ค้นหาผู้ใช้จากอีเมล
        const user = await User.findOne({ email });

        // ถ้าไม่พบผู้ใช้
        if (!user) {
            return res.status(404).json({ message: "อีเมลไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง" });
        }

        // ถ้าพบผู้ใช้ จะส่งสถานะสำเร็จกลับไป
        return res.status(200).json({ message: "อีเมลได้รับการยืนยัน" });
    } catch (error) {
        console.error("Error verifying email:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบอีเมล" });
    }
});


router.post("/cart-clear", async(req, res) => {
    const { email, cart } = req.body;

    try {
        // ค้นหาผู้ใช้จากอีเมล
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้ที่มีอีเมลนี้" });
        }

        // ตรวจสอบว่าผู้ใช้มีตะกร้าหรือไม่
        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: "ตะกร้าของคุณว่างเปล่า" });
        }

        // ลดจำนวนสินค้าใน collection 'Product' ตามจำนวนที่อยู่ในตะกร้า
        const promises = cart.map(async(item) => {
            // แปลง productId ให้เป็น ObjectId โดยใช้ new
            const productId = new mongoose.Types.ObjectId(item.productId); // ใช้ new สำหรับ ObjectId

            // ค้นหาสินค้าในฐานข้อมูลโดยใช้ productId
            const product = await Product.findById(productId); // ใช้ _id ของสินค้า

            if (product) {
                // ตรวจสอบว่า quantity ที่ผู้ใช้ต้องการลดไม่เกินจำนวนที่มีในคลัง
                if (product.quantity >= item.quantity) {
                    // ลดจำนวนสินค้าในฐานข้อมูล
                    await Product.findByIdAndUpdate(productId, {
                        $inc: { quantity: -item.quantity }, // ลดจำนวนสินค้า
                    });
                } else {
                    console.log(`ไม่สามารถลดจำนวนสินค้า ${item.productId} เนื่องจากสต็อกไม่เพียงพอ`);
                }
            } else {
                console.log(`ไม่พบสินค้า ${item.productId} ในฐานข้อมูล`);
            }
        });

        // รอให้การลดจำนวนสินค้าทุกตัวเสร็จ
        await Promise.all(promises);

        // เคลียร์ตะกร้าของผู้ใช้
        user.cart = [];
        await user.save();

        return res.status(200).json({ message: "สินค้าถูกลดจำนวนและตะกร้าถูกเคลียร์แล้ว" });
    } catch (error) {
        console.error("Error clearing cart and updating products:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตจำนวนสินค้า" });
    }
});


// ✅ Route สมัครสมาชิก
router.post("/register", register);

// ✅ Endpoint Login
router.post("/login", login);
router.post("/profile", getUserProfile);
//router.post("/update", updateUserProfile);

router.post("/add-address", addAddress);
router.get('/addresses', getUserAddresses);

module.exports = router;