async function checkZipCode(zip) {

 let apply_filter = "";
 
  try {
  

    const response = await 
 fetch('https://hwqzbpmjjifxjxanujml.supabase.co/rest/v1/rpc/get_health_plans_by_zip_codes_v5', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3cXpicG1qamlmeGp4YW51am1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM0MDgyMjcsImV4cCI6MjAzODk4NDIyN30.PM1mrp0oMV46E99AIYKp4UQn8upxs-2wAeZf8arihwA',
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3cXpicG1qamlmeGp4YW51am1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM0MDgyMjcsImV4cCI6MjAzODk4NDIyN30.PM1mrp0oMV46E99AIYKp4UQn8upxs-2wAeZf8arihwA',
        'content-type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        any_county: true,
        coverage_types_list: [],
        has_reduction_or_giveback: "All",
        medicare_advantage_type_filter: apply_filter,
        zip_codes_list: [zip],
        input_benefits_year: "2025",
        coverage_type_details_filter: "",
        include_counties_and_zip_codes: true,
        result_limit: 99999,
        result_offset: 0,
        carriers_list: ["WellCare", "Centene","Humana","Anthem", "WellPoint", "Wellcare", "Allwell","Wellcare health net", "CarePlus"],
        order_by_field: "Giveback",
        order_direction: "DESC"
      })
    });

    // Parse the response as JSON
    let data = await response.json();

    const countiesArray = data
      .map(plan => plan.counties.split(',').map(county => county.trim())) 
      .flat(); 

    const uniqueCountiesArray = [...new Set(countiesArray)];

    if (uniqueCountiesArray.length > 1) {
      console.log('There are multiple counties:', uniqueCountiesArray);
    } else {
      console.log('All plans are from the same county:', uniqueCountiesArray[0]);
    }

    console.log('Filtered data with unique counties:', uniqueCountiesArray);
    filtered_counties = uniqueCountiesArray;
    
    if(uniqueCountiesArray.length > 0){
    	
    }

    // Filter data to include only entries with sunfire_carrier_id
    const filteredData = data.filter(function (item) {
      return item.sunfire_carrier_id !== null; 
    });
    
    // Sort the filtered data by reduction_or_giveback in descending order
    const sortedData = filteredData.sort((a, b) => b.reduction_or_giveback - a.reduction_or_giveback);
    
    //data.filter(item => item.sunfire_carrier_id !== null);
    
    fetched_data.push(sortedData);
    // Return the filtered data
    return data;
    //return data;
    
    fetched_data.push(data);

  } catch (error) {
    console.error('Error:', error);
    return null; 
  }
}
//Check Zip Code