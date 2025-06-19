const mongoose = require("mongoose");

// Define the user schema with comprehensive validation and auto-incrementing ID
const userSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      required: false, // Will be set automatically in pre-save hook
      index: true,
      min: [1, 'ID must be greater than 0']
    },
    phoneNumber: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function (v) {
          // Allow null/undefined or validate phone number format
          return v == null || /^[\d\+\-\(\)\s]+$/.test(v);
        },
        message: 'Phone number contains invalid characters'
      },
      index: true
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          // Allow null/undefined or validate email format
          return v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please enter a valid email address'
      },
      index: true
    },
    linkedId: {
      type: Number,
      required: false,
      default: null,
      validate: {
        validator: function (v) {
          // linkedId should not reference itself
          return v == null || v !== this.id;
        },
        message: 'LinkedId cannot reference itself'
      },
      index: true
    },
    linkPrecedence: {
      type: String,
      required: true,
      enum: {
        values: ['primary', 'secondary'],
        message: 'Link precedence must be either "primary" or "secondary"'
      },
      default: 'primary',
      index: true
    },
    createdAt: {
      type: Number,
      required: true,
      default: () => Math.floor(Date.now() / 1000), // Unix timestamp
      immutable: true // Cannot be changed after creation
    },
    updatedAt: {
      type: Number,
      required: true,
      default: () => Math.floor(Date.now() / 1000) // Unix timestamp
    },
    deletedAt: {
      type: Number,
      default: null,
      validate: {
        validator: function (v) {
          // deletedAt should be greater than createdAt if set
          return v == null || v >= this.createdAt;
        },
        message: 'Deleted date cannot be before creation date'
      }
    }
  },
  {
    collection: "users",
    // Disable automatic timestamps since we're using custom Unix timestamps
    timestamps: false,
    // Add version key for optimistic concurrency control
    versionKey: '__v',
    // Optimize queries
    optimisticConcurrency: true
  }
);

// Compound indexes for better query performance
userSchema.index({ phoneNumber: 1, email: 1 });
userSchema.index({ linkPrecedence: 1, linkedId: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ deletedAt: 1 }, { sparse: true }); // Sparse index for soft deletes

// Auto-increment ID before validation
userSchema.pre('validate', async function (next) {
  try {
    // Only set ID for new documents
    if (this.isNew && !this.id) {
      const lastUser = await this.constructor
        .findOne({}, { id: 1 })
        .sort({ id: -1 })
        .lean();

      this.id = lastUser ? lastUser.id + 1 : 1;
    }

    // Check either phoneNumber or email is provided
    if (!this.phoneNumber && !this.email) {
      this.invalidate('phoneNumber', 'Either phoneNumber or email must be provided');
      this.invalidate('email', 'Either phoneNumber or email must be provided');
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Auto-increment ID function (reusable for bulk operations)
async function autoIncrementId(doc, Model) {
  if (!doc.id) {
    const lastUser = await Model
      .findOne({}, { id: 1 })
      .sort({ id: -1 })
      .lean();

    doc.id = lastUser ? lastUser.id + 1 : 1;
  }
}

// Update timestamp on save
userSchema.pre('save', function (next) {
  // Update the updatedAt timestamp on every save
  this.updatedAt = Math.floor(Date.now() / 1000);
  next();
});

// Handle bulk operations like insertMany
userSchema.pre('insertMany', async function (next, docs) {
  try {
    // Get the current max ID once
    const lastUser = await this.findOne({}, { id: 1 })
      .sort({ id: -1 })
      .lean();

    let currentMaxId = lastUser ? lastUser.id : 0;

    // Assign incremental IDs to all documents
    for (const doc of docs) {
      if (!doc.id) {
        currentMaxId += 1;
        doc.id = currentMaxId;
      }

      // Set timestamps
      const now = Math.floor(Date.now() / 1000);
      if (!doc.createdAt) doc.createdAt = now;
      if (!doc.updatedAt) doc.updatedAt = now;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Validation for secondary contacts
userSchema.pre('save', function (next) {
  if (this.linkPrecedence === 'secondary' && !this.linkedId) {
    return next(new Error('Secondary contacts must have a linkedId'));
  }

  if (this.linkPrecedence === 'primary' && this.linkedId) {
    return next(new Error('Primary contacts cannot have a linkedId'));
  }

  next();
});

// Instance method to soft delete
userSchema.methods.softDelete = function () {
  this.deletedAt = Math.floor(Date.now() / 1000);
  this.updatedAt = Math.floor(Date.now() / 1000);
  return this.save();
};

// Instance method to restore soft deleted document
userSchema.methods.restore = function () {
  this.deletedAt = null;
  this.updatedAt = Math.floor(Date.now() / 1000);
  return this.save();
};

// Instance method to check if document is deleted
userSchema.methods.isDeleted = function () {
  return this.deletedAt !== null;
};

// Static method to find non-deleted documents
userSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, deletedAt: null });
};

// Static method to find by phone or email
userSchema.statics.findByContact = function (phoneNumber, email) {
  const query = { deletedAt: null };

  if (phoneNumber && email) {
    query.$or = [{ phoneNumber }, { email }];
  } else if (phoneNumber) {
    query.phoneNumber = phoneNumber;
  } else if (email) {
    query.email = email;
  } else {
    return this.find({ _id: null }); // Return empty result
  }

  return this.find(query);
};

// Static method to get contact hierarchy (primary + all secondary contacts)
userSchema.statics.getContactHierarchy = async function (primaryId) {
  const primary = await this.findOne({
    id: primaryId,
    linkPrecedence: 'primary',
    deletedAt: null
  });

  if (!primary) return null;

  const secondaryContacts = await this.find({
    linkedId: primaryId,
    linkPrecedence: 'secondary',
    deletedAt: null
  }).sort({ createdAt: 1 });

  return {
    primary,
    secondary: secondaryContacts,
    all: [primary, ...secondaryContacts]
  };
};

// Virtual for formatted creation date
userSchema.virtual('createdAtDate').get(function () {
  return new Date(this.createdAt * 1000);
});

// Virtual for formatted update date
userSchema.virtual('updatedAtDate').get(function () {
  return new Date(this.updatedAt * 1000);
});

// Virtual for formatted deletion date
userSchema.virtual('deletedAtDate').get(function () {
  return this.deletedAt ? new Date(this.deletedAt * 1000) : null;
});

// Transform function for JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Remove mongoose version key from output
  delete obj.__v;

  return obj;
};

// Add text search index for phone and email
userSchema.index({
  phoneNumber: 'text',
  email: 'text'
}, {
  name: 'contact_text_index',
  weights: { phoneNumber: 10, email: 5 }
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
