import { Train } from "@/lib/types";

// Helper to get a random station index between 1 and (route.length - 2)
const getRandomStationIndex = (routeLength: number): number => {
  if (routeLength <= 2) return 0;
  return Math.floor(Math.random() * (routeLength - 2)) + 1;
};

// Helper to generate a spread of scheduled arrival ISO strings today with +05:30 offset
const getScheduledTime = (index: number): string => {
  const today = new Date();
  const startHour = 6;
  const endHour = 23;
  const hourSpan = endHour - startHour;
  
  const hour = startHour + Math.floor((index * hourSpan) / 50);
  const minutes = (index * 12) % 60;
  
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const min = String(minutes).padStart(2, "0");
  
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00+05:30`;
};

const corridor1Route = ["NDLS", "NZM", "MTJ", "GWL", "JHS", "BPL", "ET", "KOTA", "RTM", "BRC", "ST", "BCT"];
const corridor2Route = ["NDLS", "CNB", "ALD", "DDU", "PNBE", "DHN", "HWH"];
const corridor3Route = ["NDLS", "AGC", "JHS", "ET", "NGP", "SC", "MAS"];
const corridor4Route = ["CSTM", "PUNE", "SUR", "SC", "GTL", "SBC"];
const corridor5Route = ["NDLS", "UMB", "LDH", "ASR"];

const RAW_SEED_TRAINS = [
  // Corridor 1: Delhi-Mumbai
  { id: "12951", name: "Mumbai Rajdhani Express", number: "12951", route: corridor1Route, passengers: 1100 },
  { id: "12953", name: "August Kranti Rajdhani", number: "12953", route: corridor1Route, passengers: 980 },
  { id: "12009", name: "Mumbai Shatabdi Express", number: "12009", route: corridor1Route, passengers: 750 },
  { id: "12263", name: "Pune Duronto Express", number: "12263", route: corridor1Route, passengers: 860 },
  { id: "19019", name: "Saurashtra Express", number: "19019", route: corridor1Route, passengers: 1200 },
  { id: "12903", name: "Golden Temple Mail", number: "12903", route: corridor1Route, passengers: 1350 },
  { id: "12471", name: "Swaraj Express", number: "12471", route: corridor1Route, passengers: 920 },
  { id: "12955", name: "Jaipur Mumbai Express", number: "12955", route: corridor1Route, passengers: 780 },
  { id: "12961", name: "Avantika Express", number: "12961", route: corridor1Route, passengers: 680 },
  { id: "12137", name: "Punjab Mail", number: "12137", route: corridor1Route, passengers: 1450 },

  // Corridor 2: Delhi-Howrah
  { id: "12301", name: "Howrah Rajdhani Express", number: "12301", route: corridor2Route, passengers: 1050 },
  { id: "12305", name: "Howrah Rajdhani (via Patna)", number: "12305", route: corridor2Route, passengers: 990 },
  { id: "12273", name: "Howrah Duronto Express", number: "12273", route: corridor2Route, passengers: 870 },
  { id: "13007", name: "Udyan Abha Toofan Express", number: "13007", route: corridor2Route, passengers: 1400 },
  { id: "12303", name: "Poorva Express", number: "12303", route: corridor2Route, passengers: 1250 },
  { id: "12381", name: "Poorabini Express", number: "12381", route: corridor2Route, passengers: 890 },
  { id: "12307", name: "Howrah Jodhpur Express", number: "12307", route: corridor2Route, passengers: 760 },
  { id: "13049", name: "Amritsar Howrah Express", number: "13049", route: corridor2Route, passengers: 1150 },
  { id: "12391", name: "Shramjeevi Express", number: "12391", route: corridor2Route, passengers: 980 },
  { id: "15657", name: "Brahmaputra Mail", number: "15657", route: corridor2Route, passengers: 1100 },

  // Corridor 3: Delhi-Chennai
  { id: "12621", name: "Tamil Nadu Express", number: "12621", route: corridor3Route, passengers: 1050 },
  { id: "12615", name: "Grand Trunk Express", number: "12615", route: corridor3Route, passengers: 980 },
  { id: "12433", name: "Rajdhani Express (Chennai)", number: "12433", route: corridor3Route, passengers: 890 },
  { id: "12839", name: "Howrah Chennai Mail", number: "12839", route: corridor3Route, passengers: 1200 },
  { id: "12163", name: "Chennai Dadar Express", number: "12163", route: corridor3Route, passengers: 750 },
  { id: "12721", name: "Dakshin Express", number: "12721", route: corridor3Route, passengers: 1100 },
  { id: "12641", name: "Thirukkural Express", number: "12641", route: corridor3Route, passengers: 870 },
  { id: "12613", name: "Hyderabad Rajdhani", number: "12613", route: corridor3Route, passengers: 920 },
  { id: "12625", name: "Kerala Express", number: "12625", route: corridor3Route, passengers: 1300 },
  { id: "22691", name: "Rajdhani Express (Bangalore)", number: "22691", route: corridor3Route, passengers: 960 },

  // Corridor 4: Mumbai-Bangalore
  { id: "11301", name: "Udyan Express", number: "11301", route: corridor4Route, passengers: 1150 },
  { id: "16589", name: "Rani Chennamma Express", number: "16589", route: corridor4Route, passengers: 980 },
  { id: "12627", name: "Karnataka Express", number: "12627", route: corridor4Route, passengers: 1080 },
  { id: "16529", name: "Udyan Express (Dadar)", number: "16529", route: corridor4Route, passengers: 870 },
  // ID is changed to "12163-M" to avoid collision with "12163" from Corridor 3
  { id: "12163-M", name: "Mumbai Madurai Express", number: "12163", route: corridor4Route, passengers: 920 },
  { id: "11013", name: "Mumbai Coimbatore Express", number: "11013", route: corridor4Route, passengers: 780 },
  { id: "16331", name: "Mumbai Trivandrum Express", number: "16331", route: corridor4Route, passengers: 860 },
  { id: "11007", name: "Deccan Express", number: "11007", route: corridor4Route, passengers: 650 },
  { id: "12219", name: "Secunderabad Rajdhani", number: "12219", route: corridor4Route, passengers: 890 },
  { id: "17032", name: "Mumbai Hyderabad Express", number: "17032", route: corridor4Route, passengers: 1020 },

  // Corridor 5: Delhi-Amritsar
  { id: "12013", name: "Amritsar Shatabdi Express", number: "12013", route: corridor5Route, passengers: 680 },
  { id: "12029", name: "Swarna Shatabdi Express", number: "12029", route: corridor5Route, passengers: 720 },
  { id: "12357", name: "Durgiana SF Express", number: "12357", route: corridor5Route, passengers: 980 },
  { id: "14033", name: "Jammu Mail", number: "14033", route: corridor5Route, passengers: 1250 },
  { id: "12459", name: "Delhi Amritsar Express", number: "12459", route: corridor5Route, passengers: 850 },
  { id: "14681", name: "New Delhi Jalandhar Express", number: "14681", route: corridor5Route, passengers: 780 },
  { id: "12715", name: "Sachkhand Express", number: "12715", route: corridor5Route, passengers: 920 },
  { id: "14201", name: "LKO NE Express", number: "14201", route: corridor5Route, passengers: 1100 },
  { id: "12237", name: "Begampura Express", number: "12237", route: corridor5Route, passengers: 860 },
  { id: "11057", name: "Amritsar Express", number: "11057", route: corridor5Route, passengers: 940 }
];

export const SEED_TRAINS: Train[] = RAW_SEED_TRAINS.map((train, index) => {
  const currentStationIndex = getRandomStationIndex(train.route.length);
  const origin = train.route[0];
  const destination = train.route[train.route.length - 1];
  
  return {
    id: train.id,
    name: train.name,
    number: train.number,
    origin,
    destination,
    route: train.route,
    current_station_index: currentStationIndex,
    scheduled_arrival: getScheduledTime(index),
    actual_arrival: null,
    delay_minutes: 0,
    status: "on_time",
    passengers: train.passengers,
    updated_at: new Date().toISOString()
  };
});
