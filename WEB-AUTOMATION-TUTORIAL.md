# Web Automation Tutorial - Educational Project

## Overview

This is an educational web automation project that teaches you how to automate form filling and web interactions using Playwright. The project includes:

- **A test registration form** (HTML) that you own and control
- **Automation scripts** that demonstrate various automation techniques
- **Multiple scenarios** including single registration, batch processing, and validation testing

**IMPORTANT:** This project is for educational purposes only. Use automation tools only on websites you own or have explicit permission to test.

---

## What You'll Learn

### 1. Core Concepts
- Browser automation basics
- Element selection strategies
- Form interaction (typing, clicking, selecting)
- Waiting for elements and page states
- Screenshot capture for verification
- Error handling in automation

### 2. Practical Skills
- Setting up Playwright
- Writing maintainable automation scripts
- Debugging automation issues
- Batch processing
- Form validation testing

### 3. Best Practices
- Configuration management
- Modular code structure
- Logging and monitoring
- Screenshot documentation
- Error recovery

---

## Files Included

```
youtube-to-facebook/
├── test-registration-form.html      # Your test form (simulates IMVU-like registration)
├── registration-automation.js       # Main automation script
├── WEB-AUTOMATION-TUTORIAL.md      # This file
└── automation-screenshots/          # Screenshots saved here (auto-created)
```

---

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Navigate to this directory** (already done if you're here)
   ```bash
   cd /Users/kirbydimsontompong/youtube-to-facebook
   ```

2. **Playwright is already installed**, but if you need to reinstall:
   ```bash
   npm install playwright
   ```

3. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install chromium
   ```

---

## How to Use

### 1. View the Test Form

Open the test form in your browser to see what we're automating:

```bash
open test-registration-form.html
```

Or navigate to: `file:///Users/kirbydimsontompong/youtube-to-facebook/test-registration-form.html`

### 2. Run Single Registration (Recommended for Learning)

This runs one registration with the browser visible so you can watch:

```bash
node registration-automation.js single
```

**What happens:**
- Browser opens (you can see it)
- Form fills out automatically
- Screenshots are saved to `automation-screenshots/`
- Registration completes
- Browser closes

### 3. Run Batch Registration

Automate multiple registrations in sequence:

```bash
# Register 3 users (default)
node registration-automation.js batch

# Register 5 users
node registration-automation.js batch 5
```

### 4. Test Form Validation

See how automation handles validation errors:

```bash
node registration-automation.js validate
```

---

## Understanding the Code

### Configuration (Lines 20-35)

```javascript
const CONFIG = {
    headless: false,      // Set to true to hide browser
    slowMo: 500,         // Delay between actions (ms)
    formUrl: '...',      // URL to automate
    // ... more settings
};
```

**Try this:** Change `headless: true` to run without visible browser (faster)

### Element Selection Strategies

The script demonstrates multiple ways to select elements:

```javascript
// By ID
await page.fill('#username', 'testuser');

// By CSS selector
await page.click('button[type="submit"]');

// By text content
await page.click('text=Create Account');

// Using Locator API
await page.locator('#email').fill('test@example.com');
```

### Form Interactions

```javascript
// Text input
await page.fill('#username', userData.username);

// Dropdown selection
await page.selectOption('#dobMonth', '05');

// Checkbox
await page.check('#terms');

// Radio button
await page.click('#avatar2');

// Click button
await page.click('button[type="submit"]');
```

### Waiting for Elements

```javascript
// Wait for element to be visible
await page.waitForSelector('#successMessage', {
    state: 'visible',
    timeout: 5000
});

// Wait for navigation
await page.goto(url, { waitUntil: 'networkidle' });

// Custom delay (for demonstration)
await delay(1000);
```

---

## Customization Guide

### Change the Form

Edit `test-registration-form.html` to add/remove fields. Common additions:
- Phone number field
- Address fields
- Custom validation rules
- Multi-step forms

### Modify Automation Logic

Edit `registration-automation.js`:

1. **Change generated data** (lines 42-57):
   ```javascript
   function generateUserData() {
       return {
           username: 'your_custom_logic_here',
           // ... customize all fields
       };
   }
   ```

2. **Add new automation steps**:
   ```javascript
   // After step 13, add:
   console.log('New step: Doing something else...');
   await page.click('#new-element');
   ```

3. **Change timing**:
   ```javascript
   slowMo: 100,  // Faster (100ms between actions)
   slowMo: 1000, // Slower (1 second between actions)
   ```

### Run in Headless Mode (Production)

For running without visible browser:

```javascript
// In CONFIG
headless: true,
slowMo: 0,  // No delays
```

Or override from command line:
```javascript
const browser = await chromium.launch({
    headless: process.env.HEADLESS === 'true',
    slowMo: parseInt(process.env.SLOW_MO || '0')
});
```

Then run:
```bash
HEADLESS=true node registration-automation.js single
```

---

## Common Use Cases (Educational)

### 1. Testing Your Own Website

```javascript
// Change the URL to your local development server
const CONFIG = {
    formUrl: 'http://localhost:3000/register',
    // ... rest of config
};
```

### 2. Load Testing

```javascript
// Test how your form handles multiple submissions
await batchRegistration(100);
```

### 3. Validation Testing

```javascript
// Test various validation scenarios
const testCases = [
    { email: 'invalid', expectedError: true },
    { password: '123', expectedError: true },
    { username: 'ab', expectedError: true },
];

for (const test of testCases) {
    // Test each case...
}
```

### 4. Cross-Browser Testing

```javascript
const { chromium, firefox, webkit } = require('playwright');

// Test on different browsers
for (const browserType of [chromium, firefox, webkit]) {
    const browser = await browserType.launch();
    // ... run tests
}
```

---

## Playwright Cheat Sheet

### Essential Methods

| Task | Code |
|------|------|
| Fill text input | `await page.fill('#id', 'text')` |
| Click element | `await page.click('#id')` |
| Select dropdown | `await page.selectOption('#id', 'value')` |
| Check checkbox | `await page.check('#id')` |
| Uncheck checkbox | `await page.uncheck('#id')` |
| Take screenshot | `await page.screenshot({ path: 'file.png' })` |
| Wait for element | `await page.waitForSelector('#id')` |
| Get text content | `await page.textContent('#id')` |
| Evaluate JS | `await page.evaluate(() => { ... })` |
| Press key | `await page.press('#id', 'Enter')` |

### Locator Strategies

```javascript
// CSS selectors
'#id'                          // ID
'.class'                       // Class
'button[type="submit"]'        // Attribute
'div > button'                 // Child
'input.form-control'           // Combination

// Text-based
'text=Create Account'          // Exact text
'text=/submit/i'              // Regex, case-insensitive

// XPath
'xpath=//button[@type="submit"]'

// Playwright Locator API
page.locator('#id')
page.locator('text=Submit')
page.getByRole('button', { name: 'Submit' })
```

---

## Advanced Topics

### 1. Reading Data from Files

Load test data from CSV or JSON:

```javascript
const fs = require('fs');

// From JSON
const users = JSON.parse(fs.readFileSync('users.json'));

// From CSV
const csv = require('csv-parser');
const users = [];
fs.createReadStream('users.csv')
  .pipe(csv())
  .on('data', (row) => users.push(row));
```

### 2. Parallel Execution

Run multiple browsers simultaneously:

```javascript
const { chromium } = require('playwright');

async function runParallel(userDataList) {
    const promises = userDataList.map(async (userData) => {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        // ... automate
        await browser.close();
    });

    await Promise.all(promises);
}
```

### 3. API Integration

Verify registrations via API:

```javascript
const axios = require('axios');

// After form submission
const response = await axios.get(`/api/users/${userData.username}`);
console.log('User created:', response.data);
```

### 4. Error Recovery

Handle failures gracefully:

```javascript
for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        await automateRegistration(userData);
        break; // Success
    } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error.message);
        if (attempt === 3) throw error;
        await delay(5000); // Wait before retry
    }
}
```

---

## Troubleshooting

### Issue: "Cannot find element"
**Solution:** Add wait before interacting:
```javascript
await page.waitForSelector('#element', { state: 'visible' });
await page.click('#element');
```

### Issue: "Element is not clickable"
**Solution:** Element might be covered or disabled:
```javascript
// Wait for element to be enabled
await page.waitForSelector('#element:not([disabled])');

// Or scroll into view
await page.locator('#element').scrollIntoViewIfNeeded();
```

### Issue: "Timeout while waiting"
**Solution:** Increase timeout:
```javascript
await page.waitForSelector('#element', { timeout: 10000 }); // 10 seconds
```

### Issue: Form doesn't submit
**Solution:** Check if validation is blocking:
```javascript
// Check validity
const isValid = await page.evaluate(() => {
    return document.querySelector('form').checkValidity();
});
console.log('Form valid:', isValid);
```

---

## Learning Resources

### Official Documentation
- **Playwright Docs:** https://playwright.dev/
- **API Reference:** https://playwright.dev/docs/api/class-page

### Tutorials
- Playwright Getting Started: https://playwright.dev/docs/intro
- Selector Best Practices: https://playwright.dev/docs/selectors

### Community
- Playwright Discord: https://aka.ms/playwright/discord
- Stack Overflow: Tag `playwright`

---

## Next Steps

### Beginner
1. ✅ Run the single registration and watch it work
2. ✅ Modify the test form to add a new field
3. ✅ Update the automation to fill the new field
4. Try changing the `slowMo` value to speed up/slow down

### Intermediate
1. Create your own HTML form for a different use case
2. Read test data from a JSON file instead of generating it
3. Add email format validation testing
4. Implement retry logic for failed registrations

### Advanced
1. Build a multi-page registration flow (step 1, 2, 3...)
2. Integrate with a real backend API
3. Implement parallel execution for faster batch processing
4. Add comprehensive error handling and reporting
5. Create a dashboard to visualize test results

---

## Ethical Guidelines

### ✅ DO:
- Use on websites you own or develop
- Test with permission from website owners
- Use for authorized security testing
- Practice on demo sites designed for automation
- Learn for legitimate purposes

### ❌ DON'T:
- Automate third-party sites without permission
- Create spam or fake accounts on production sites
- Violate Terms of Service
- Use for any malicious purposes
- Bypass rate limits or security measures on sites you don't own

---

## License & Disclaimer

This educational project is provided as-is for learning purposes. The authors are not responsible for any misuse of the techniques demonstrated here.

**Always ensure you have proper authorization before automating any website.**

---

## Questions?

This tutorial covers the fundamentals of web automation. As you practice:

1. Experiment with the code
2. Break things and fix them (that's how you learn!)
3. Read the Playwright documentation
4. Build your own projects

Happy automating! 🚀
