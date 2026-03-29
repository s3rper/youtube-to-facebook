/**
 * WEB AUTOMATION TUTORIAL - Registration Form Automation
 *
 * This script demonstrates how to automate form filling using Playwright.
 * Key concepts covered:
 * 1. Browser launching and page navigation
 * 2. Element selection and interaction
 * 3. Form filling strategies
 * 4. Waiting for elements
 * 5. Taking screenshots for verification
 * 6. Error handling
 *
 * EDUCATIONAL USE ONLY - Use only on websites you own or have permission to test.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ==================== CONFIGURATION ====================
const CONFIG = {
    // Set to false to see the browser in action (useful for learning)
    headless: false,

    // Slow down actions so you can see what's happening (milliseconds)
    slowMo: 500,

    // URL of the form to automate (using local file for testing)
    formUrl: 'file://' + path.join(__dirname, 'test-registration-form.html'),

    // Screenshot directory
    screenshotDir: path.join(__dirname, 'automation-screenshots'),

    // Viewport size
    viewport: { width: 1280, height: 720 }
};

// ==================== USER DATA GENERATOR ====================
/**
 * Generates random user data for testing
 * In real scenarios, you might read this from a CSV, database, or API
 */
function generateUserData() {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);

    return {
        username: `testuser_${timestamp}_${randomNum}`,
        email: `test.${timestamp}@example.com`,
        password: 'SecurePassword123!',
        dobMonth: '05',
        dobDay: '15',
        dobYear: '1990',
        gender: 'male',
        avatar: 'avatar2',
        agreeToTerms: true,
        newsletter: true
    };
}

// ==================== HELPER FUNCTIONS ====================
/**
 * Creates screenshot directory if it doesn't exist
 */
function ensureScreenshotDir() {
    if (!fs.existsSync(CONFIG.screenshotDir)) {
        fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
        console.log(`📁 Created screenshot directory: ${CONFIG.screenshotDir}`);
    }
}

/**
 * Takes a screenshot with timestamp
 */
async function takeScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);

    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);
    return filepath;
}

/**
 * Adds a delay (for educational purposes to see actions)
 */
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== MAIN AUTOMATION FUNCTION ====================
/**
 * Main function that performs the registration automation
 */
async function automateRegistration(userData) {
    console.log('\n🚀 Starting registration automation...\n');

    // Ensure screenshot directory exists
    ensureScreenshotDir();

    // STEP 1: Launch the browser
    console.log('1️⃣  Launching browser...');
    const browser = await chromium.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo
    });

    try {
        // STEP 2: Create a new page/tab
        console.log('2️⃣  Creating new page...');
        const page = await browser.newPage({
            viewport: CONFIG.viewport
        });

        // STEP 3: Navigate to the registration form
        console.log(`3️⃣  Navigating to: ${CONFIG.formUrl}`);
        await page.goto(CONFIG.formUrl, {
            waitUntil: 'networkidle' // Wait until network is idle
        });

        // Take initial screenshot
        await takeScreenshot(page, 'step1_initial_load');

        // STEP 4: Fill in the username field
        console.log(`4️⃣  Filling username: ${userData.username}`);
        await page.fill('#username', userData.username);
        // Alternative methods:
        // await page.locator('#username').fill(userData.username);
        // await page.type('#username', userData.username); // Types character by character

        // STEP 5: Fill in the email field
        console.log(`5️⃣  Filling email: ${userData.email}`);
        await page.fill('#email', userData.email);

        // STEP 6: Fill in the password field
        console.log(`6️⃣  Filling password: ${'*'.repeat(userData.password.length)}`);
        await page.fill('#password', userData.password);

        // Take screenshot after basic fields
        await takeScreenshot(page, 'step2_basic_fields_filled');

        // STEP 7: Select date of birth
        console.log(`7️⃣  Selecting date of birth: ${userData.dobMonth}/${userData.dobDay}/${userData.dobYear}`);

        // Select month
        await page.selectOption('#dobMonth', userData.dobMonth);
        await delay(300);

        // Select day
        await page.selectOption('#dobDay', userData.dobDay);
        await delay(300);

        // Select year
        await page.selectOption('#dobYear', userData.dobYear);
        await delay(300);

        // STEP 8: Select gender
        console.log(`8️⃣  Selecting gender: ${userData.gender}`);
        await page.selectOption('#gender', userData.gender);

        // STEP 9: Select avatar
        console.log(`9️⃣  Selecting avatar: ${userData.avatar}`);
        await page.click(`#${userData.avatar}`);
        await delay(500); // Wait to see the selection animation

        // Take screenshot after selections
        await takeScreenshot(page, 'step3_selections_made');

        // STEP 10: Check the terms checkbox
        console.log(`🔟 Agreeing to terms: ${userData.agreeToTerms}`);
        if (userData.agreeToTerms) {
            await page.check('#terms');
            // Alternative:
            // await page.locator('#terms').check();
        }

        // STEP 11: Check newsletter checkbox (optional)
        console.log(`1️⃣1️⃣  Newsletter subscription: ${userData.newsletter}`);
        if (userData.newsletter) {
            await page.check('#newsletter');
        }

        // Take screenshot before submission
        await takeScreenshot(page, 'step4_ready_to_submit');

        // STEP 12: Submit the form
        console.log('1️⃣2️⃣  Submitting the form...');

        // Method 1: Click the submit button
        await page.click('button[type="submit"]');

        // Alternative methods:
        // await page.locator('button[type="submit"]').click();
        // await page.click('text=Create Account');
        // await page.press('#password', 'Enter'); // Submit via Enter key

        // STEP 13: Wait for success message
        console.log('1️⃣3️⃣  Waiting for success message...');

        // Wait for the success message to appear
        await page.waitForSelector('#successMessage', {
            state: 'visible',
            timeout: 5000
        });

        // Take final screenshot
        await takeScreenshot(page, 'step5_success');

        // STEP 14: Extract and verify registration data
        console.log('1️⃣4️⃣  Extracting registration data...');

        // Get the success message text
        const successMessage = await page.textContent('#successMessage');
        console.log(`   ✅ Success message: ${successMessage}`);

        // Get the registration data displayed on the page
        const registrationDataElement = await page.locator('#registrationData');
        const isVisible = await registrationDataElement.isVisible();

        if (isVisible) {
            const registrationData = await registrationDataElement.textContent();
            console.log(`   📋 Registration data:\n${registrationData}`);
        }

        console.log('\n✨ Registration automation completed successfully!\n');

        // Wait a bit so you can see the result
        await delay(2000);

        return {
            success: true,
            userData: userData,
            successMessage: successMessage
        };

    } catch (error) {
        console.error('\n❌ Error during automation:', error.message);

        // Take error screenshot
        try {
            const page = browser.contexts()[0]?.pages()[0];
            if (page) {
                await takeScreenshot(page, 'error');
            }
        } catch (screenshotError) {
            console.error('Could not take error screenshot');
        }

        throw error;

    } finally {
        // STEP 15: Close the browser
        console.log('1️⃣5️⃣  Closing browser...');
        await delay(1000);
        await browser.close();
    }
}

// ==================== ADVANCED AUTOMATION SCENARIOS ====================

/**
 * Demonstrates form validation testing
 */
async function testFormValidation() {
    console.log('\n🧪 Testing form validation...\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 300
    });

    try {
        const page = await browser.newPage({ viewport: CONFIG.viewport });
        await page.goto(CONFIG.formUrl, { waitUntil: 'networkidle' });

        // Try to submit empty form
        console.log('Testing: Submitting empty form...');
        await page.click('button[type="submit"]');
        await delay(1000);

        // Check if validation messages appear
        const isUsernameInvalid = await page.evaluate(() => {
            return document.getElementById('username').validity.valid === false;
        });

        console.log(`   Username validation triggered: ${isUsernameInvalid}`);

        // Try invalid email
        console.log('Testing: Invalid email...');
        await page.fill('#email', 'invalid-email');
        await page.click('button[type="submit"]');
        await delay(1000);

        console.log('✅ Validation testing complete\n');

    } finally {
        await browser.close();
    }
}

/**
 * Demonstrates multiple registrations in sequence
 */
async function batchRegistration(count = 3) {
    console.log(`\n📦 Running batch registration (${count} users)...\n`);

    const results = [];

    for (let i = 1; i <= count; i++) {
        console.log(`\n========== REGISTRATION ${i}/${count} ==========`);
        const userData = generateUserData();

        try {
            const result = await automateRegistration(userData);
            results.push({ index: i, success: true, userData });

            // Wait between registrations
            await delay(2000);

        } catch (error) {
            results.push({ index: i, success: false, error: error.message });
        }
    }

    // Summary
    console.log('\n========== BATCH SUMMARY ==========');
    console.log(`Total: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);

    return results;
}

// ==================== ENTRY POINT ====================

/**
 * Main execution function
 */
async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   WEB AUTOMATION TUTORIAL - REGISTRATION BOT  ║');
    console.log('║   Educational purposes only                     ║');
    console.log('╚════════════════════════════════════════════════╝');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const mode = args[0] || 'single';

    try {
        switch (mode) {
            case 'single':
                // Single registration with random data
                const userData = generateUserData();
                await automateRegistration(userData);
                break;

            case 'batch':
                // Multiple registrations
                const count = parseInt(args[1]) || 3;
                await batchRegistration(count);
                break;

            case 'validate':
                // Test form validation
                await testFormValidation();
                break;

            default:
                console.log('\n📖 Usage:');
                console.log('   node registration-automation.js single          - Single registration');
                console.log('   node registration-automation.js batch [count]   - Batch registration');
                console.log('   node registration-automation.js validate        - Test validation');
                console.log('');
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the automation if this file is executed directly
if (require.main === module) {
    main();
}

// Export functions for use in other scripts
module.exports = {
    automateRegistration,
    testFormValidation,
    batchRegistration,
    generateUserData,
    CONFIG
};
