function scanPlans() {

  if (executed) {
    console.warn("Function already executed.");
    return Promise.reject(new Error("Function already executed."));
  }

  executed = true;
  
  const url = "https://hwqzbpmjjifxjxanujml.supabase.co/functions/v1/prompt-ai-sob-context-cache/query-cache-session";

if (selectedbenefit === '') {
  selectedbenefit = "Double check my current plan for ANY missing benefits";
}

const requestBody = {
  sessionId: "",
  zip: zip_code,
  county: county,
  prompt: `The user just finished providing their info. 
- County: ${county} County
- Current coverage: ${medicare_choice}
- Additional coverage: ${addtl_coverage}
- Desires: The user specifically cares about ${selectedbenefit} and a Social Security Giveback
- From our plan data API, we found:
    * Plan Carrier: ${plan_carrier}
    * ${monthly_premium}
    * $0 copays for preventive coverage
    * $0 copay per hospital stay
- The user qualifies based on their ZIP and monthly income.

Please generate the final Senior Benefits Calculator summary. Emphasize how these extra benefits add up, mention $0 premium instead of 'free', highlight that Medicaid can combine with these extra plan perks, include a clear breakdown for Dental Allowance, Vision Allowance, Flex Card Allowance, Social Security Giveback, Monthly Premium, Preventative Coverage, Hospital Stay Coverage, Drug Reduction, Refund Amount and end with a CTA to proceed to enrollment or speak to an agent. 

What other plans do you have in the user's area that maybe better than what was found here and if no other plan was found to be better go into detail on why this plan is the better in comparison to the others?

Please review user’s current coverage and then find it a plan with more savings and benefits specifically focused to the user’s desires. Please ensure your are comparing the current plan with the new plan as you describe the benefits. If a user is already in a PPO, never put them in an HMO.`
};

fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3cXpicG1qamlmeGp4YW51am1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzQwODIyNywiZXhwIjoyMDM4OTg0MjI3fQ.YgG5oPYdwbLlSnndIwErBB4e0MsPkDGGGM94xPLRsaQ`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(requestBody)
})
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    console.log("Response:", data);

    const responseText = data?.response || "";

    const benefitData = {
      dentalAllowance: "$2,000",
      visionAllowance: "$500",
      flexCardAllowance: "$100",
      socialSecurityGiveback: "$50",
      monthlyPremium: "$0",
      preventativeCoverage: "$0",
      hospitalStayCoverage: "$0",
      drugReduction: "$0",
      refundAmount: "$200"
    };

    const keywordPatterns = [
      { key: "dentalAllowance", patterns: [/dental.*?\$[\d,]+/i] },
      { key: "visionAllowance", patterns: [/vision.*?\$[\d,]+/i] },
      { key: "flexCardAllowance", patterns: [/(flex card|spendables).*?\$[\d,]+/i] },
      { key: "socialSecurityGiveback", patterns: [/(social security check|social security giveback).*?\$[\d,]+/i] },
      { key: "monthlyPremium", patterns: [/plan.*?\$[\d,]+ per month/i, /monthly premium.*?\$[\d,]+/i] },
      { key: "preventativeCoverage", patterns: [/\$[\d,]+ copays? for preventive/i] },
      { key: "hospitalStayCoverage", patterns: [/\$[\d,]+ copays? (per )?hospital/i] },
      { key: "drugReduction", patterns: [/drug.*?reduced.*?\$[\d,]+.*?\$[\d,]+/i, /prescription.*?\$[\d,]+/i] },
      { key: "refundAmount", patterns: [/refund.*?\$[\d,]+/i] }
    ];

    const normalize = str => str.toLowerCase().replace(/[^\w\s\$.,%-]/g, "");

    const normalizedResponse = normalize(responseText);

    keywordPatterns.forEach(({ key, patterns }) => {
      for (let regex of patterns) {
        const match = normalizedResponse.match(regex);
        if (match) {
          const valueMatch = match[0].match(/\$[\d,]+/);
          if (valueMatch) {
            benefitData[key] = valueMatch[0];
            break;
          }
        }
      }
    });

    // Console logging each value cleanly
    console.log("Extracted Benefits Summary:");
    Object.entries(benefitData).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    // Still triggering internal clicks
    const cleanAmount = parseFloat(
      String(benefitData.refundAmount).replace(/[^0-9.-]+/g, '')
    );
    const per_year = parseInt(cleanAmount * 12);
    
    $('.sbc2-dental-allowance').text(benefitData.dentalAllowance);
    $('.sbc2-vision-allowance').text(benefitData.visionAllowance);
    $('.sbc2-flex-allowance').text(benefitData.flexCardAllowance);
    $('.sbc2-refund-amount').text(benefitData.refundAmount);
    $('.sbc2-refund-amount-year').text(`$` + per_year.toLocaleString());
    
    const selected_drug = $('.rx-name.show').text();
    
    if(selected_drug === `I don't take any prescriptions`){
			$('.dont-take-drug').show();
      $('.take-drug').hide();
		}
    else {
      $('.dont-take-drug').hide();
      $('.take-drug').show();
      
      $('.chat-drug').text(selected_drug);
    }

    document.getElementById('continue-plan-results').click();

    const result = {
      response: responseText,
      benefitData
    };

    console.log("Final Result:", result);
  })
  .catch(error => {
    console.error("API Error:", error);
    console.warn("Using dummy response as fallback...");

    const fallbackBenefitData = {
      dentalAllowance: "$2,000",
      visionAllowance: "$500",
      flexCardAllowance: "$100",
      socialSecurityGiveback: "$50",
      monthlyPremium: "$0",
      preventativeCoverage: "$0",
      hospitalStayCoverage: "$0",
      drugReduction: "$0",
      refundAmount: "$200"
    };

    console.log({
      response: "Fallback response: Sample summary with realistic values."
    });

    console.log("Fallback Benefit Data:", fallbackBenefitData);
    
        // Still triggering internal clicks
        const cleanAmount = parseFloat(
          String(fallbackBenefitData.refundAmount).replace(/[^0-9.-]+/g, '')
        );
        const per_year = parseInt(cleanAmount * 12);

        $('.sbc2-dental-allowance').text(fallbackBenefitData.dentalAllowance);
        $('.sbc2-vision-allowance').text(fallbackBenefitData.visionAllowance);
        $('.sbc2-flex-allowance').text(fallbackBenefitData.flexCardAllowance);
        $('.sbc2-refund-amount').text(fallbackBenefitData.refundAmount);
        $('.sbc2-refund-amount-year').text(`$` + per_year.toLocaleString());

        const selected_drug = $('.rx-name.show').text();

        if(selected_drug === `I don't take any prescriptions`){
          $('.dont-take-drug').show();
          $('.take-drug').hide();
        }
        else {
          $('.dont-take-drug').hide();
          $('.take-drug').show();

          $('.chat-drug').text(selected_drug);
        }

        document.getElementById('continue-plan-results').click();
  });
    
    
}
