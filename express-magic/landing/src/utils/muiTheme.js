import { createTheme } from "@mui/material/styles";

const headingFont = '"Poppins", "Segoe UI", sans-serif';
const bodyFont = '"Poppins", "Segoe UI", sans-serif';

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#ED1C24",
    },
    secondary: {
      main: "#061A33",
    },
    background: {
      default: "#F5F8FC",
      paper: "#ffffff",
    },
    text: {
      primary: "#061A33",
      secondary: "#64748B",
    },
  },
  typography: {
    fontFamily: bodyFont,
    h1: {
      fontFamily: headingFont,
      fontWeight: 800,
      letterSpacing: 0,
      lineHeight: 0.92,
    },
    h2: {
      fontFamily: headingFont,
      fontWeight: 800,
      letterSpacing: 0,
      lineHeight: 0.98,
    },
    h3: {
      fontFamily: headingFont,
      fontWeight: 800,
      letterSpacing: 0,
      lineHeight: 1.05,
    },
    h4: {
      fontFamily: headingFont,
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
      fontFamily: bodyFont,
    },
  },
  shape: {
    borderRadius: 18,
  },
});

export default theme;
