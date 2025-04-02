const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
});
const OrderSchema = new mongoose.Schema({
    shippingAddress: AddressSchema, // ที่อยู่การจัดส่ง
    products: [{
        productCode: String,
        name: String,
        image: String,
        price: Number,
        size: String,
        quantity: Number,
    }],
    totalAmount: { type: Number, required: true }, // ยอดรวมทั้งหมด
    status: { type: String, default: "Completed" }, // สถานะการสั่งซื้อ
    createdAt: { type: Date, default: Date.now }, // วันที่ทำการสั่งซื้อ
});
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    cart: [{
        productCode: String,
        name: String,
        image: String,
        price: Number,
        size: String,
        quantity: Number,
    }],
    addresses: [AddressSchema],
    orders: [OrderSchema], // เพิ่มฟิลด์นี้เพื่อเก็บที่อยู่
});

module.exports = mongoose.model("User", UserSchema);