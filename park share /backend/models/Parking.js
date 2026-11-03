
import mongoose from "mongoose";

const parkingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  vehicle: {
    type: String,
    enum: ["Car", "Bike"],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 1
  },
  lat: {
    type: Number,
    min: -90,
    max: 90,
    default: null
  },
  lng: {
    type: Number,
    min: -180,
    max: 180,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model("Parking", parkingSchema);
