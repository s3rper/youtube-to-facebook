(async function inviteWithScroll() {
    let maxRetries = 5; // Max retries before stopping
    let retries = 0;
  
    while (retries < maxRetries) {
      // Get the "Loading..." element
      const loadingElement = document.querySelector('[aria-label="Loading..."]');
      const inviteButtons = document.querySelectorAll('[aria-label="Invite"]');
  
      if (!loadingElement) {
        console.warn("No 'Loading...' element found. Retrying...");
        retries++;
        await new Promise(resolve => setTimeout(resolve, 4000)); // Wait before retrying
        continue;
      }
  
      // Scroll to the "Loading..." element
      loadingElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  
      console.log("Scrolled to 'Loading...'. Waiting for new content...");
  
      await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for new content to load
  
      // Click each "Invite" button with a 500ms interval
      if (inviteButtons.length > 0) {
        console.log(`Clicking ${inviteButtons.length} invite buttons...`);
  
        for (let i = 0; i < inviteButtons.length; i++) {
          inviteButtons[i].click();
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms per click
        }
  
        retries = 0; // Reset retries since new buttons were found
      } else {
        console.log("No more 'Invite' buttons found.");
        retries++;
      }
    }
  
    console.log("Finished clicking all available invite buttons.");
  })();
  