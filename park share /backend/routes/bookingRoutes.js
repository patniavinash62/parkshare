
import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Parking from "../models/Parking.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// CREATE BOOKING
router.post("/", protect, async (req, res) => {
  try {
    const { parkingId, start, end } = req.body;

    if (!mongoose.isValidObjectId(parkingId)) {
      return res.status(400).json({
        message: "Invalid parking ID"
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime()) ||
      startDate <= new Date() ||
      endDate <= startDate
    ) {
      return res.status(400).json({
        message: "Invalid booking dates"
      });
    }

    const hours =
      (endDate.getTime() - startDate.getTime()) / 3600000;

    if (hours > 24) {
      return res.status(400).json({
        message: "Maximum booking duration is 24 hours"
      });
    }

    const parking = await Parking.findOne({
      _id: parkingId,
      isActive: true
    });

    if (!parking) {
      return res.status(404).json({
        message: "Parking not found"
      });
    }

    if (parking.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot book your own parking"
      });
    }

    const existingBooking = await Booking.findOne({
      parking: parkingId,
      status: "Confirmed",
      start: { $lt: endDate },
      end: { $gt: startDate }
    });

    if (existingBooking) {
      return res.status(409).json({
        message: "Parking already booked for this time"
      });
    }

    const total = Math.round(hours * parking.price * 100) / 100;

    const booking = await Booking.create({
      user: req.user._id,
      parking: parkingId,
      start: startDate,
      end: endDate,
      total
    });

    res.status(201).json({
      message: "Booking confirmed",
      booking
    });

  } catch {
    res.status(500).json({
      message: "Booking failed"
    });
  }
});

// MY BOOKINGS
router.get("/mine", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.user._id
    })
      .populate("parking", "name city address price vehicle")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch {
    res.status(500).json({
      message: "Unable to load bookings"
    });
  }
});

// CANCEL BOOKING
router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid booking ID"
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    if (
      booking.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({
        message: "Booking already cancelled"
      });
    }

    booking.status = "Cancelled";
    await booking.save();

    res.json({
      message: "Booking cancelled successfully",
      booking
    });

  } catch {
    res.status(500).json({
      message: "Unable to cancel booking"
    });
  }
});

export default router;
