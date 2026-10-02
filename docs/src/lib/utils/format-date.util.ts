// One date format across the blog feed and the header panel, so they cannot drift apart.
export const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
