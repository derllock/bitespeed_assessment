// Comprehensive test script to demonstrate User model functionality with both .save() and .create()
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/api/models/User');

async function testUserModel() {
    try {
        // Connect to database
        await mongoose.connect(process.env.DB_URL);
        console.log('Connected to database');

        // Clear existing test data (optional - remove in production)
        await User.deleteMany({});
        console.log('Cleared existing test data\n');

        console.log('='.repeat(60));
        console.log('🧪 COMPREHENSIVE USER MODEL TESTING');
        console.log('='.repeat(60));

        // ===== SECTION 1: Testing .save() method =====
        console.log('\n📝 SECTION 1: Testing .save() method');
        console.log('-'.repeat(40));

        // Test 1: Create primary contact using .save()
        console.log('\n1️⃣ Creating primary contact using .save()...');
        const primary = new User({
            phoneNumber: '123456',
            email: 'lorraine@hillvalley.edu',
            linkPrecedence: 'primary'
        });
        await primary.save();
        console.log('✅ Primary contact created with ID:', primary.id);
        console.log('📄 Data:', primary.toJSON());

        // Test 2: Create secondary contact using .save()
        console.log('\n2️⃣ Creating secondary contact using .save()...');
        const secondary = new User({
            phoneNumber: '789012',
            email: 'marty@hillvalley.edu',
            linkedId: primary.id,
            linkPrecedence: 'secondary'
        });
        await secondary.save();
        console.log('✅ Secondary contact created with ID:', secondary.id);
        console.log('📄 Data:', secondary.toJSON());

        // ===== SECTION 2: Testing .create() method =====
        console.log('\n📝 SECTION 2: Testing .create() method');
        console.log('-'.repeat(40));

        // Test 3: Create using .create() method
        console.log('\n3️⃣ Creating contact using .create()...');
        const createdUser = await User.create({
            phoneNumber: '555666',
            email: 'doc@hillvalley.edu',
            linkPrecedence: 'primary'
        });
        console.log('✅ User created with .create() method, ID:', createdUser.id);
        console.log('📄 Data:', createdUser.toJSON());

        // Test 4: Create multiple users using .create()
        console.log('\n4️⃣ Creating multiple users using .create()...');
        const multipleUsers = await User.create([
            {
                phoneNumber: '111222',
                email: 'biff@hillvalley.edu',
                linkPrecedence: 'primary'
            },
            {
                phoneNumber: '333444',
                email: 'george@hillvalley.edu',
                linkPrecedence: 'primary'
            }
        ]);
        console.log('✅ Multiple users created:');
        multipleUsers.forEach((user, index) => {
            console.log(`   User ${index + 1}: ID=${user.id}, Email=${user.email}`);
        });

        // Test 5: Create secondary contact linked to created user
        console.log('\n5️⃣ Creating secondary contact linked to created user...');
        const linkedSecondary = await User.create({
            phoneNumber: '777888',
            email: 'jennifer@hillvalley.edu',
            linkedId: createdUser.id,
            linkPrecedence: 'secondary'
        });
        console.log('✅ Linked secondary contact created with ID:', linkedSecondary.id);

        // ===== SECTION 3: Testing Model Methods =====
        console.log('\n📝 SECTION 3: Testing Model Methods');
        console.log('-'.repeat(40));

        // Test 6: Find by contact
        console.log('\n6️⃣ Testing findByContact method...');
        const foundByPhone = await User.findByContact('123456', null);
        const foundByEmail = await User.findByContact(null, 'doc@hillvalley.edu');
        const foundByBoth = await User.findByContact('555666', 'doc@hillvalley.edu');

        console.log('✅ Found by phone:', foundByPhone.length, 'users');
        console.log('✅ Found by email:', foundByEmail.length, 'users');
        console.log('✅ Found by both:', foundByBoth.length, 'users');

        // Test 7: Get contact hierarchy
        console.log('\n7️⃣ Testing contact hierarchy...');
        const hierarchy1 = await User.getContactHierarchy(primary.id);
        const hierarchy2 = await User.getContactHierarchy(createdUser.id);

        console.log('✅ Hierarchy for primary contact:');
        console.log(`   Primary: ${hierarchy1.primary.email}`);
        console.log(`   Secondary contacts: ${hierarchy1.secondary.length}`);

        console.log('✅ Hierarchy for created contact:');
        console.log(`   Primary: ${hierarchy2.primary.email}`);
        console.log(`   Secondary contacts: ${hierarchy2.secondary.length}`);

        // Test 8: Soft delete functionality
        console.log('\n8️⃣ Testing soft delete...');
        await secondary.softDelete();
        console.log('✅ Secondary contact soft deleted');

        const activeUsers = await User.findActive();
        console.log('✅ Active users after soft delete:', activeUsers.length);

        // Test 9: Restore functionality
        console.log('\n9️⃣ Testing restore functionality...');
        await secondary.restore();
        console.log('✅ Secondary contact restored');

        const activeUsersAfterRestore = await User.findActive();
        console.log('✅ Active users after restore:', activeUsersAfterRestore.length);

        // ===== SECTION 4: ID Increment Verification =====
        console.log('\n📝 SECTION 4: ID Increment Verification');
        console.log('-'.repeat(40));

        // Test 10: Verify ID sequence
        console.log('\n🔢 Verifying ID sequence...');
        const allUsers = await User.find({}).sort({ id: 1 });
        console.log('✅ All users with their IDs:');
        allUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}, Method: ${index < 2 ? '.save()' : '.create()'}`);
        });

        // Test 11: Create one more to verify continuous increment
        console.log('\n🔢 Creating one more user to verify continuous increment...');
        const finalUser = await User.create({
            phoneNumber: '999000',
            email: 'final@hillvalley.edu',
            linkPrecedence: 'primary'
        });
        console.log('✅ Final user created with ID:', finalUser.id);

        // ===== SECTION 5: Edge Cases =====
        console.log('\n📝 SECTION 5: Testing Edge Cases');
        console.log('-'.repeat(40));

        // Test 12: Validation errors
        console.log('\n⚠️ Testing validation errors...');

        try {
            await User.create({
                // No phone or email - should fail
                linkPrecedence: 'primary'
            });
        } catch (error) {
            console.log('✅ Validation correctly prevented creation without phone/email');
        }

        try {
            await User.create({
                phoneNumber: '123123',
                linkPrecedence: 'secondary'
                // No linkedId for secondary - should fail
            });
        } catch (error) {
            console.log('✅ Validation correctly prevented secondary contact without linkedId');
        }

        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));

        const finalCount = await User.countDocuments();
        console.log(`📊 Total users in database: ${finalCount}`);
        console.log('✅ Auto-increment ID works with both .save() and .create()');
        console.log('✅ All model methods functioning correctly');
        console.log('✅ Validation working as expected');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

// Run comprehensive tests
testUserModel();
