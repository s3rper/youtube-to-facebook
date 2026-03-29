//Test Environment
const TOKEN_ENDPOINT = 'https://api.pverify.com/Test/Token';
const CLIENT_ID = 'd01dd7ba-5b48-4a88-ac00-1e2b0e0fd798';
const CLIENT_SECRET = '9YBtygowzqrq9tqTYVjwCuTRbONPiQ';
// Initialize the session object if it doesn't exist
let employerCoverage = null;
let isVeteran = null;
let hasMedicaid  = null;

if (!session) {
  var session = {};
}
if (!session.pverify) {
  session.pverify = {};
}

const TOKEN_BUFFER_SECONDS = 300; // 5 minutes
const TOKEN_TTL_SECONDS = 21000;  // 5.83 hours

let gender = "M";

class TokenService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  async getToken() {
    const now = Math.floor(Date.now() / 1000);

    // If token is still valid and not near expiration
    if (this.token && this.tokenExpiry && now < this.tokenExpiry - TOKEN_BUFFER_SECONDS) {
      return this.token;
    }

    const urlencoded = new URLSearchParams();
    urlencoded.append("Client_Id", CLIENT_ID);
    urlencoded.append("Client_Secret", CLIENT_SECRET);
    urlencoded.append("grant_type", "client_credentials");

    const requestOptions = {
      method: 'POST',
      body: urlencoded,
      redirect: 'follow'
    };

    try {
      const response = await fetch(TOKEN_ENDPOINT, requestOptions);
      const data = await response.json();

      if (data.access_token) {
        this.token = data.access_token;
        this.tokenExpiry = now + TOKEN_TTL_SECONDS;
        return this.token;
      } else {
        throw new Error('Failed to retrieve access token');
      }
    } catch (error) {
      console.log('Token fetch error:', error);
      throw error;
    }
  }
}


async function fetchInsuranceDiscovery(token) {
  const headers = new Headers();
  headers.append("Authorization", `Bearer ${token}`);
  headers.append("Client-API-Id", CLIENT_ID);
  headers.append("Content-Type", "application/json");
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const referenceId = crypto.randomUUID();
  
  const firstName = $('#first-name').val().trim();
  const lastName = $('#last-name').val().trim(); // Optional for more context

  if (firstName) {
    $.get(`https://api.genderize.io?name=${encodeURIComponent(firstName)}`, function(response) {
      if (response.gender) {
        gender = response.gender === 'male' ? 'M' : 'F';
        //console.log(`Predicted Gender: ${gender}`);
      } else {
        console.log('Could not determine gender.');
      }
    }).fail(function() {
      console.log('Error calling Genderize API');
    });
  } else {
    console.log('First name is required.');
  }

  const body = JSON.stringify({
    doS_EndDate: formattedDate,
    doS_StartDate: formattedDate,
    //patientState: patientState,
    //patientStateId: stateID,
    //patientState: "CA",
    patientStateId: getRandom10or11(),
    patientSSN: "",
    patientLastName: $('#last-name').val(),
    patientFirstName: $('#first-name').val(),
    patientDOB: $('#date-of-birth').val(),
    patientGender: gender,
    referenceId: referenceId,
    //location: "CA1",
    notes: ""
  });

  const requestOptions = {
    method: 'POST',
    headers,
    body,
    redirect: 'follow'
  };

  try {
    const response = await fetch("https://api.pverify.com/Test/api/InsuranceDiscovery", requestOptions);
    //const response = await fetch("https://api.pverify.com/api/InsuranceDiscovery", requestOptions);
    const result = await response.json(); // or .text() depending on the API response format
    
    session.pverify.discovery = result;
        
    $('.chat-plan').text(result.PlanCoverageSummary.PlanName);
    
    if(result.PCPAuthInfoSummary.PrimaryCareProviderName){
      $('.chat-doctor').text(result.PCPAuthInfoSummary.PrimaryCareProviderName);
    }
    
    employerCoverage = result.IsHMOPlan;
    isVeteran = result.DemographicInfo.Subscriber;
    hasMedicaid  = null;

    
  } catch (error) {
    console.log('Fetch error:', error);
  }
}