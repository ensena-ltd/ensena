// Countries offered on the tutor sign-up, each with its full list of
// first-level subdivisions (states / regions / counties / provinces), used
// for the Country -> State dropdown. `institutionsKey` is the country's
// name in the world-universities dataset (src/data/institutions.json).

export interface CountryInfo {
  name: string;
  subdivisionLabel: string;
  subdivisions: string[];
  institutionsKey: string;
}

export const countries: CountryInfo[] = [
  {
    name: "Nigeria",
    subdivisionLabel: "State",
    institutionsKey: "Nigeria",
    subdivisions: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
      "Ekiti", "Enugu", "Federal Capital Territory (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
      "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
    ],
  },
  {
    name: "Ghana",
    subdivisionLabel: "Region",
    institutionsKey: "Ghana",
    subdivisions: [
      "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", "North East", "Northern", "Oti", "Savannah",
      "Upper East", "Upper West", "Volta", "Western", "Western North",
    ],
  },
  {
    name: "Kenya",
    subdivisionLabel: "County",
    institutionsKey: "Kenya",
    subdivisions: [
      "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega",
      "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni",
      "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
      "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia", "Turkana", "Uasin Gishu", "Vihiga",
      "Wajir", "West Pokot",
    ],
  },
  {
    name: "South Africa",
    subdivisionLabel: "Province",
    institutionsKey: "South Africa",
    subdivisions: ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"],
  },
  {
    name: "Cameroon",
    subdivisionLabel: "Region",
    institutionsKey: "Cameroon",
    subdivisions: ["Adamawa", "Centre", "East", "Far North", "Littoral", "North", "North-West", "South", "South-West", "West"],
  },
  {
    name: "Uganda",
    subdivisionLabel: "Region",
    institutionsKey: "Uganda",
    subdivisions: ["Central", "Eastern", "Northern", "Western"],
  },
  {
    name: "Tanzania",
    subdivisionLabel: "Region",
    institutionsKey: "Tanzania, United Republic of",
    subdivisions: [
      "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara",
      "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga",
      "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Zanzibar North", "Zanzibar South and Central", "Zanzibar Urban/West",
    ],
  },
  {
    name: "Rwanda",
    subdivisionLabel: "Province",
    institutionsKey: "Rwanda",
    subdivisions: ["Eastern", "Kigali", "Northern", "Southern", "Western"],
  },
  {
    name: "Egypt",
    subdivisionLabel: "Governorate",
    institutionsKey: "Egypt",
    subdivisions: [
      "Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia", "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia",
      "Kafr El Sheikh", "Luxor", "Matruh", "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia", "Qena", "Red Sea",
      "Sharqia", "Sohag", "South Sinai", "Suez",
    ],
  },
  {
    name: "Ethiopia",
    subdivisionLabel: "Region",
    institutionsKey: "Ethiopia",
    subdivisions: [
      "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia", "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama",
      "Somali", "South Ethiopia", "South West Ethiopia Peoples'", "Tigray",
    ],
  },
  {
    name: "Zambia",
    subdivisionLabel: "Province",
    institutionsKey: "Zambia",
    subdivisions: ["Central", "Copperbelt", "Eastern", "Luapula", "Lusaka", "Muchinga", "North-Western", "Northern", "Southern", "Western"],
  },
  {
    name: "Zimbabwe",
    subdivisionLabel: "Province",
    institutionsKey: "Zimbabwe",
    subdivisions: [
      "Bulawayo", "Harare", "Manicaland", "Mashonaland Central", "Mashonaland East", "Mashonaland West", "Masvingo",
      "Matabeleland North", "Matabeleland South", "Midlands",
    ],
  },
  {
    name: "United Kingdom",
    subdivisionLabel: "Country / Region",
    institutionsKey: "United Kingdom",
    subdivisions: [
      "England — East Midlands", "England — East of England", "England — London", "England — North East", "England — North West",
      "England — South East", "England — South West", "England — West Midlands", "England — Yorkshire and the Humber",
      "Northern Ireland", "Scotland", "Wales",
    ],
  },
  {
    name: "Ireland",
    subdivisionLabel: "County",
    institutionsKey: "Ireland",
    subdivisions: [
      "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick",
      "Longford", "Louth", "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary", "Waterford", "Westmeath", "Wexford",
      "Wicklow",
    ],
  },
  {
    name: "United States",
    subdivisionLabel: "State",
    institutionsKey: "United States",
    subdivisions: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida",
      "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
      "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
      "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
      "West Virginia", "Wisconsin", "Wyoming",
    ],
  },
  {
    name: "Canada",
    subdivisionLabel: "Province / Territory",
    institutionsKey: "Canada",
    subdivisions: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
      "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
    ],
  },
  {
    name: "Australia",
    subdivisionLabel: "State / Territory",
    institutionsKey: "Australia",
    subdivisions: [
      "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland", "South Australia", "Tasmania", "Victoria",
      "Western Australia",
    ],
  },
  {
    name: "India",
    subdivisionLabel: "State / UT",
    institutionsKey: "India",
    subdivisions: [
      "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
      "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
      "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
      "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
      "Uttarakhand", "West Bengal",
    ],
  },
];

export const countryNames = countries.map((c) => c.name);

export function countryInfo(name: string): CountryInfo | undefined {
  return countries.find((c) => c.name === name);
}
