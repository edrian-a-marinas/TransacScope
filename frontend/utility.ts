export const formatDate = (date: string | null) => {
  if (!date) return "No Date";
  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) return "Invalid Date";

  // Get the components of the date and time
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const hours = parsedDate.getHours();
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
  const isAM = hours < 12;
  const formattedHours = hours % 12 || 12; // Convert to 12-hour format
  const amPm = isAM ? "AM" : "PM";

  // Format the date as 'YYYY-MM-DD, HH:mm AM/PM'
  return `${year}-${month}-${day}, ${formattedHours}:${minutes} ${amPm}`;
};