const UtilController = require("./../services/UtilController");
const returnCode = require("./../../../config/responseCode").returnCode;
const User = require("./../../models/User");
const mongoose = require("mongoose");

// Helper method to discover all related contacts using BFS
async function discoverContactFamily(initialContacts) {
  const allRelatedContactIds = new Set();
  const queue = [...initialContacts];
  const processed = new Set();

  while (queue.length > 0) {
    const contact = queue.shift();

    if (processed.has(contact.id)) {
      continue;
    }

    processed.add(contact.id);
    allRelatedContactIds.add(contact.id);

    // Find all contacts linked to this one (both directions)
    const linkedContacts = await User.find({
      $or: [
        { linkedId: contact.id },
        { id: contact.linkedId },
        { linkedId: contact.linkedId }
      ].filter(condition => Object.values(condition)[0] != null),
      deletedAt: null
    });

    // Add newly discovered contacts to the queue
    linkedContacts.forEach(linkedContact => {
      if (!processed.has(linkedContact.id)) {
        queue.push(linkedContact);
        allRelatedContactIds.add(linkedContact.id);
      }
    });
  }

  return allRelatedContactIds;
}
// Helper method to ensure only one primary contact exists
async function consolidatePrimaryContact(allContacts, designatedPrimary) {
  const updatePromises = [];

  for (const contact of allContacts) {
    if (contact.id !== designatedPrimary.id && contact.linkPrecedence === 'primary') {
      updatePromises.push(
        User.findOneAndUpdate(
          { id: contact.id },
          {
            linkPrecedence: 'secondary',
            linkedId: designatedPrimary.id,
            updatedAt: Math.floor(Date.now() / 1000)
          },
          { new: true }
        )
      );
    }
  }

  await Promise.all(updatePromises);
}
// Helper method to generate the final contact response
async function generateContactResponse(primaryContactId) {
  const hierarchy = await User.getContactHierarchy(primaryContactId);

  if (!hierarchy) {
    throw new Error('Primary contact not found');
  }

  const allContacts = hierarchy.all;

  // Collect unique emails and phone numbers
  const emails = [...new Set(
    allContacts
      .map(contact => contact.email)
      .filter(Boolean)
  )];

  const phoneNumbers = [...new Set(
    allContacts
      .map(contact => contact.phoneNumber)
      .filter(Boolean)
  )];

  // Get secondary contact IDs
  const secondaryContactIds = hierarchy.secondary.map(contact => contact.id);

  return {
    contact: {
      primaryContatctId: hierarchy.primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds
    }
  };
}
module.exports = {
  identifyContact: async (req, res) => {
    try {
      const { email, phoneNumber } = req.body;

      // Validation: At least one contact method required
      if (!email && !phoneNumber) {
        return res.status(400).json({
          error: "At least one of email or phoneNumber is required"
        });
      }

      //Find all existing contacts that match either email or phoneNumber
      const existingContacts = await User.findByContact(phoneNumber, email);

      //  No matches - create a new primary contact
      if (existingContacts.length === 0) {
        const newContact = await User.create({
          email,
          phoneNumber,
          linkPrecedence: 'primary'
        });

        return res.status(200).json({
          contact: {
            primaryContatctId: newContact.id,
            emails: [email].filter(Boolean),
            phoneNumbers: [phoneNumber].filter(Boolean),
            secondaryContactIds: []
          }
        });
      }

      //  Discover the complete contact family using BFS
      const allRelatedContactIds = await discoverContactFamily(existingContacts);

      // Fetch all related contacts
      const allContacts = await User.find({
        id: { $in: Array.from(allRelatedContactIds) },
        deletedAt: null
      }).sort({ createdAt: 1 });

      //Determine the primary contact (oldest one)
      let primaryContact = allContacts.reduce((oldest, current) => {
        return current.createdAt < oldest.createdAt ? current : oldest;
      });

      //  Ensure only one primary contact exists
      await consolidatePrimaryContact(allContacts, primaryContact);

      // Check if we need to create a new secondary contact
      const hasEmail = email ? allContacts.some(c => c.email === email) : true;
      const hasPhone = phoneNumber ? allContacts.some(c => c.phoneNumber === phoneNumber) : true;

      if (!hasEmail || !hasPhone) {
        await User.create({
          email,
          phoneNumber,
          linkPrecedence: 'secondary',
          linkedId: primaryContact.id
        });
      }

      //Generate final response
      const response = await generateContactResponse(primaryContact.id);
      return res.status(200).json(response);

    } catch (error) {
      console.error('Error in identifyContact:', error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  },
  // Get contact hierarchy by ID
  getContactHierarchy: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Valid contact ID is required" });
      }

      const hierarchy = await User.getContactHierarchy(parseInt(id));

      if (!hierarchy) {
        return res.status(404).json({ error: "Contact not found" });
      }

      return res.status(200).json({
        success: true,
        hierarchy: {
          primary: hierarchy.primary.toJSON(),
          secondary: hierarchy.secondary.map(contact => contact.toJSON()),
          totalContacts: hierarchy.all.length
        }
      });
    } catch (error) {
      console.error('Error getting contact hierarchy:', error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  },

};
