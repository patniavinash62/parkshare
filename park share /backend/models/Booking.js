
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  parking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parking",
    required: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ["Confirmed", "Cancelled"],
    default: "Confirmed"
  }
}, { timestamps: true });

bookingSchema.index({
  parking: 1,
  start: 1,
  end: 1
});

export default mongoose.model("Booking", bookingSchema);
