import "./styles/globals.css";

export const metadata = {
  title: "BritishAgro Admin",
  description: "BritishAgro Farm Management Admin Panel",
  icons: {
    icon: "/assests/images/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
