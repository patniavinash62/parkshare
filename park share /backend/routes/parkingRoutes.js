
import express from "express";
import mongoose from "mongoose";
import Parking from "../models/Parking.js";
import Booking from "../models/Booking.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// FIND ALL PARKING
router.get("/", async (req, res) => {
  try {
    const { city, vehicle, maxPrice } = req.query;

    const filter = { isActive: true };

    if (city && typeof city === "string") {
      filter.city = {
        $regex: city.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i"
      };
    }

    if (vehicle && ["Car", "Bike"].includes(vehicle)) {
      filter.vehicle = vehicle;
    }

    if (maxPrice !== undefined) {
      const price = Number(maxPrice);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          message: "Invalid maximum price"
        });
      }

      filter.price = { $lte: price };
    }

    const spaces = await Parking.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(spaces);

  } catch {
    res.status(500).json({
      message: "Unable to load parking spaces"
    });
  }
});

// MY PARKING LISTINGS
router.get("/mine", protect, authorize("host", "admin"), async (req, res) => {
  try {
    const spaces = await Parking.find({
      owner: req.user._id
    }).sort({ createdAt: -1 });

    res.json(spaces);
  } catch {
    res.status(500).json({
      message: "Unable to load listings"
    });
  }
});

// ADD PARKING
router.post("/", protect, authorize("host", "admin"), async (req, res) => {
  try {
    const { name, city, address, vehicle, price, lat, lng } = req.body;

    const numericPrice = Number(price);

    if (
      typeof name !== "string" ||
      typeof city !== "string" ||
      typeof address !== "string" ||
      !name.trim() ||
      !city.trim() ||
      !address.trim() ||
      !["Car", "Bike"].includes(vehicle) ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        message: "Invalid parking details"
      });
    }

    const parking = await Parking.create({
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      vehicle,
      price: numericPrice,
      lat: lat === "" || lat == null ? null : Number(lat),
      lng: lng === "" || lng == null ? null : Number(lng),
      owner: req.user._id
    });

    res.status(201).json({
      message: "Parking added successfully",
      parking
    });

  } catch (error) {
    res.status(400).json({
      message: "Unable to add parking. Check your details."
    });
  }
});

// DELETE PARKING
router.delete("/:id", protect, authorize("host", "admin"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid parking ID"
      });
    }

    const parking = await Parking.findById(req.params.id);

    if (!parking) {
      return res.status(404).json({
        message: "Parking not found"
      });
    }

    if (
      req.user.role !== "admin" &&
      parking.owner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You cannot delete this parking"
      });
    }

    const activeBooking = await Booking.exists({
      parking: parking._id,
      status: "Confirmed",
      end: { $gt: new Date() }
    });

    if (activeBooking) {
      return res.status(409).json({
        message: "Parking has active or future bookings"
      });
    }

    parking.isActive = false;
    await parking.save();

    res.json({
      message: "Parking removed successfully"
    });

  } catch {
    res.status(500).json({
      message: "Unable to delete parking"
    });
  }
});

export default router;
