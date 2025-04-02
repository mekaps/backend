const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const bodyParser = require("body-parser");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 5000;
app.use(bodyParser.json());

// Middleware
const nodemailer = require("nodemailer"); // เพิ่มการ require Nodemailer
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// ✅ เชื่อมต่อ MongoDB
mongoose
    .connect(process.env.MONGO_URI, {})
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((error) => console.error("❌ MongoDB Connection Error:", error));

app.get("/", (req, res) => {
    res.send("Hello World! 🌍");
});
/* ✅ ดึงข้อมูลตะกร้าของผู้ใช้ */
app.get("/cart/:email", async(req, res) => {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: "❌ ไม่พบผู้ใช้" });
    res.json(user.cart);
});

/* ✅ เพิ่มสินค้าในตะกร้า (แก้ไขให้เพิ่มจำนวนถ้าสินค้าซ้ำกัน) */
app.post("/cart/add", async(req, res) => {
    try {
        const { email, products } = req.body;

        // ตรวจสอบว่า email และ products ถูกส่งมาหรือไม่
        if (!email || !Array.isArray(products)) {
            return res.status(400).json({ message: "❌ Missing email or products array" });
        }

        let user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "❌ ไม่พบผู้ใช้" });

        // ตรวจสอบว่า _id และ price ถูกส่งมาหรือไม่
        products.forEach((product) => {
            if (!product._id || !product.price) {
                return res.status(400).json({ message: "❌ Missing _id or price in product" });
            }

            // ใช้ _id แทน productCode
            const existingItem = user.cart.find((item) => item._id.toString() === product._id.toString());

            if (existingItem) {
                // ถ้ามีสินค้าอยู่แล้ว → เพิ่มจำนวน
                existingItem.quantity += product.quantity || 1;
            } else {
                // ถ้าเป็นสินค้าใหม่ → เพิ่มลงตะกร้า
                user.cart.push({...product, quantity: product.quantity || 1 });
            }
        });

        await user.save();
        res.json(user.cart); // ส่งตะกร้าที่อัพเดตกลับไป
    } catch (error) {
        console.error("❌ Error adding products to cart:", error);
        res.status(500).json({ message: "❌ Error adding products to cart" });
    }
});


/* ✅ ลบสินค้าออกจากตะกร้า */

// ลบสินค้าออกจากตะกร้า
app.post("/cart/remove", async(req, res) => {
    try {
        const { email, productId } = req.body;

        // ค้นหาผู้ใช้
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "❌ User not found" });
        }

        // ค้นหาสินค้าในตะกร้า
        const productIndex = user.cart.findIndex(item => item._id.toString() === productId.toString());

        if (productIndex === -1) {
            return res.status(404).json({ message: "❌ Product not found in cart" });
        }

        // ลบสินค้าจากตะกร้า
        user.cart.splice(productIndex, 1); // ลบสินค้าโดยใช้ splice

        // บันทึกข้อมูลใหม่
        await user.save();

        // ส่งตะกร้าสินค้ากลับ
        res.json(user.cart); // ส่งแค่ตะกร้า (ไม่ต้องห่อใน object อื่น)
    } catch (error) {
        console.error("❌ Error removing product from cart:", error);
        res.status(500).json({ message: "❌ Error removing product from cart" });
    }
});



/* ✅ อัปเดตจำนวนสินค้าในตะกร้า */
app.post("/cart/update", async(req, res) => {
    try {
        const { email, productId, quantity } = req.body; // ใช้ `productId` แทน `productCode`

        // ตรวจสอบค่าของ quantity ว่ามากกว่า 0 หรือไม่
        if (quantity <= 0) {
            return res.status(400).json({ message: "❌ Quantity must be greater than 0" });
        }

        let user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "❌ ไม่พบผู้ใช้" });

        const product = user.cart.find((item) => item._id.toString() === productId.toString()); // ใช้ `productId`

        if (product) {
            product.quantity = quantity; // อัพเดตจำนวนสินค้า
        } else {
            return res.status(404).json({ message: "❌ สินค้าไม่พบในตะกร้า" });
        }

        await user.save();
        res.json(user.cart);
    } catch (error) {
        console.error("❌ Error updating product in cart:", error);
        res.status(500).json({ message: "❌ Error updating product in cart" });
    }
});

app.post("/create-payment-intent", async(req, res) => {
    try {
        const { amount, token } = req.body;

        if (!amount || !token) {
            console.log("Missing amount or token"); // เพิ่มการตรวจสอบ
            return res.status(400).json({ error: "Missing amount or token" });
        }

        console.log("Received amount:", amount);
        console.log("Received token:", token);

        // สร้าง PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // จำนวนเงินในหน่วยเซนต์
            currency: "thb", // สกุลเงินที่ต้องการ
            payment_method_data: {
                type: "card",
                card: {
                    token: token, // ส่ง token ที่ได้รับจาก frontend
                },
            },
            confirm: true, // ยืนยันการชำระเงินทันที
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never', // Prevent redirects during payment processing
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret, // ส่ง client_secret ไปให้ frontend
        });
    } catch (error) {
        console.error("Error creating PaymentIntent:", error); // เพิ่มการแสดงข้อผิดพลาด
        res.status(500).send({ error: "เกิดข้อผิดพลาดในการชำระเงิน" });
    }
});


// ฟังการเชื่อมต่อที่พอร์ต 5000
app.post("/verify-payment", async(req, res) => {
    try {
        const { paymentIntentId } = req.body; // รับ PaymentIntent ID จาก frontend

        // ใช้ Stripe API เพื่อดึงข้อมูลของ PaymentIntent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // ตรวจสอบสถานะการชำระเงิน
        if (paymentIntent.status === "succeeded") {
            res.send({ message: "ชำระเงินสำเร็จ!" });
        } else {
            res.status(400).send({ error: "การชำระเงินไม่สำเร็จ" });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).send({ error: "เกิดข้อผิดพลาดในการตรวจสอบการชำระเงิน" });
    }
});

app.post("/order/complete", async(req, res) => {
    const { email, shippingAddress, products, totalAmount } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอยู่ในระบบ
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    // ตรวจสอบว่ามีข้อมูลการสั่งซื้อที่จำเป็น
    if (!shippingAddress || !products || !totalAmount) {
        return res.status(400).json({ error: "Missing required data (shipping address, products, or total amount)" });
    }

    // สร้างข้อมูลการสั่งซื้อใหม่
    const newOrder = {
        shippingAddress,
        products,
        totalAmount,
        status: "Completed", // กำหนดสถานะการสั่งซื้อ
        createdAt: new Date(), // วันที่ทำการสั่งซื้อ
    };

    // เพิ่มการสั่งซื้อในฟิลด์ `orders` ของผู้ใช้
    user.orders.push(newOrder);

    // ลบสินค้าจากตะกร้า
    user.cart = [];

    // บันทึกข้อมูลในฐานข้อมูล
    await user.save();

    res.status(200).json({ message: "Order completed and cart cleared!" });
});

app.post("/cart-clear", async(req, res) => {
    const { email } = req.body;

    try {
        // ค้นหาผู้ใช้ในฐานข้อมูล
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้ที่มีอีเมลนี้" });
        }

        // ตรวจสอบว่าผู้ใช้มีตะกร้าหรือไม่
        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({ message: "ตะกร้าของคุณว่างเปล่า" });
        }

        // ลดจำนวนสินค้าใน collection 'Men' ตามสินค้าในตะกร้า
        const promises = user.cart.map(async(item) => {
            await Product.findOneAndUpdate({ _id: item.productId }, { $inc: { quantity: -item.quantity } });
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

app.post("/auth/send-order-email", async(req, res) => {
            const { email, cartItems, total, shippingAddress } = req.body;

            try {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: "officialghaca9@gmail.com", // อีเมลผู้ส่ง
                        pass: "walv kdmq vqzf zvjx", // รหัสผ่านแอป
                    },
                });

                // รูปแบบข้อความอีเมลสำหรับผู้ดูแลระบบ
                const adminMailText = `
        มีคำสั่งซื้อใหม่จาก ${email}!
  
        รายละเอียดคำสั่งซื้อ:
  
        --------------------------------------------------
        ${cartItems
          .map(
            (item) => `
        ชื่อสินค้า: ${item.name}
        ราคา: ${Number(item.price).toLocaleString()} บาท
        ขนาด: ${item.size}
        จำนวน: ${item.quantity}
        รหัสสินค้า: ${item._id}
        --------------------------------------------------
        `
          )
          .join("")}
  
        ราคารวม: ${Number(total).toLocaleString()} บาท
  
        ที่อยู่จัดส่ง:
  
        ชื่อ: ${shippingAddress.name}
        เบอร์โทร: ${shippingAddress.phone}
        ที่อยู่: ${shippingAddress.address}
      `;
  
      const adminMailOptions = {
        from: "officialghaca9@gmail.com", // อีเมลผู้ส่ง
        to: "gunndumaa123@gmail.com", // อีเมลผู้ดูแลระบบ
        subject: "คำสั่งซื้อใหม่",
        text: adminMailText,
      };
  
      const mailOptions = {
        from: "officialghaca9@gmail.com", // อีเมลผู้ส่ง
        to: email, // อีเมลลูกค้า
        subject: "ยืนยันคำสั่งซื้อของคุณ",
        text: adminMailText, // ใช้รูปแบบเดียวกับ adminMailText
      };
  
      // ส่งอีเมลไปยังผู้ดูแลระบบ
      await transporter.sendMail(adminMailOptions);
      console.log("อีเมลถูกส่งไปยังผู้ดูแลระบบ:", "makkrapong@gmail.com");
  
      // ส่งอีเมลไปยังลูกค้า
      await transporter.sendMail(mailOptions);
      console.log("อีเมลถูกส่งไปยังลูกค้า:", email);
  
      res.status(200).send("อีเมลถูกส่งแล้ว");
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).send("เกิดข้อผิดพลาดในการส่งอีเมล");
    }
  });
/* ✅ โหลด Routes */
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
/* ✅ เริ่มต้นเซิร์ฟเวอร์ */
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));