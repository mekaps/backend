const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "❌ อีเมลนี้ยังไม่มีในระบบ" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "❌ รหัสผ่านไม่ถูกต้อง" });
        }

        const token = jwt.sign({ userId: user._id }, "SECRET_KEY", { expiresIn: "1h" });
        res.json({ token, message: "✅ เข้าสู่ระบบสำเร็จ!" });
    } catch (error) {
        res.status(500).json({ message: "❌ เกิดข้อผิดพลาด" });
    }
};
// ✅ ฟังก์ชันสมัครสมาชิก
exports.register = async(req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        console.log("📞 เบอร์โทรที่รับมา:", phone); // ✅ Debug

        if (!phone) {
            return res.status(400).json({ message: "❌ กรุณากรอกเบอร์โทรศัพท์" });
        }

        // เช็คว่าอีเมลซ้ำไหม
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "❌ อีเมลนี้ถูกใช้งานแล้ว" });
        }

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        // สร้างบัญชีใหม่
        const newUser = new User({ name, email, password: hashedPassword, phone });
        await newUser.save();

        res.json({ message: "✅ สมัครสมาชิกสำเร็จ!" });
    } catch (error) {
        console.error("❌ Error in register:", error);
        res.status(500).json({ message: "❌ สมัครสมาชิกไม่สำเร็จ" });
    }
};



exports.addAddress = async(req, res) => {
    try {
        const { name, phone, address, email } = req.body;

        if (!name || !phone || !address || !email) {
            return res.status(400).json({ message: "❌ กรุณากรอกข้อมูลทั้งหมด" });
        }

        // ค้นหาผู้ใช้จาก email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "❌ ผู้ใช้ไม่พบ" });
        }

        // ตรวจสอบที่อยู่ที่ซ้ำซ้อนในระบบ
        const addressExists = user.addresses.some(
            (existingAddress) => existingAddress.address === address
        );

        if (addressExists) {
            return res.status(400).json({ message: "❌ ที่อยู่นี้ถูกเพิ่มแล้ว" });
        }

        // เพิ่มที่อยู่ใหม่ใน array addresses ของผู้ใช้
        user.addresses.push({ name, phone, address });

        await user.save(); // บันทึกการเปลี่ยนแปลง

        res.json({ message: "✅ เพิ่มที่อยู่สำเร็จ" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการเพิ่มที่อยู่" });
    }
};

exports.getUserProfile = async(req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]; // ดึง token จาก headers
        if (!token) {
            return res.status(401).json({ message: "❌ กรุณาล็อกอินก่อน" });
        }

        const decoded = jwt.verify(token, "SECRET_KEY");
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: "❌ ผู้ใช้ไม่พบ" });
        }

        res.json({
            name: user.name,
            email: user.email,
            phone: user.phone,
            addresses: user.addresses,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "❌ เกิดข้อผิดพลาด" });
    }
};

exports.updateUserProfile = async(req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]; // ดึง token จาก headers
        if (!token) {
            return res.status(401).json({ message: "❌ กรุณาล็อกอินก่อน" });
        }

        const decoded = jwt.verify(token, "SECRET_KEY");
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: "❌ ผู้ใช้ไม่พบ" });
        }

        const { name, email, phone } = req.body;

        // อัปเดตข้อมูลของผู้ใช้
        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;

        await user.save(); // บันทึกการเปลี่ยนแปลง

        res.json({ message: "✅ อัปเดตข้อมูลสำเร็จ!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "❌ เกิดข้อผิดพลาด" });
    }
};

exports.getUserAddresses = async(req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]; // ดึง token จาก headers
        if (!token) {
            return res.status(401).json({ message: "❌ กรุณาล็อกอินก่อน" });
        }

        const decoded = jwt.verify(token, "SECRET_KEY"); // ยืนยัน JWT
        const user = await User.findById(decoded.userId); // ค้นหาผู้ใช้จาก userId ที่เก็บใน token

        if (!user) {
            return res.status(404).json({ message: "❌ ผู้ใช้ไม่พบ" });
        }

        // ส่งข้อมูลที่อยู่ของผู้ใช้
        res.json(user.addresses); // ส่งที่อยู่ทั้งหมดของผู้ใช้
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการดึงข้อมูลที่อยู่" });
    }
};