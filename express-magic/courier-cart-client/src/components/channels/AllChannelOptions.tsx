import { Box, Card, Grid, Typography } from "@mui/material";
import ShopifyIntegration from "../integrations/ShopifyIntegration";
import WooCommerceIntegration from "../integrations/woocommerce/WooCommerceIntegration";

interface IAllChannelOptions {
  fromChannelList?: boolean;
}
const AllChannelOptions = ({ fromChannelList = false }: IAllChannelOptions) => {
  const connectedPlatforms = [
    {
      name: "Shopify",
      component: (
        <ShopifyIntegration fullWidth fromChannelList={fromChannelList} />
      ),
    },
    {
      name: "WooCommerce",
      component: (
        <WooCommerceIntegration fullWidth fromChannelList={fromChannelList} />
      ),
    },
    // {
    //   name: "Amazon",
    //   logo: "/logos/amazon.svg",
    //   popular: true,
    // },
    // {
    //   name: "Flipkart",
    //   logo: "/logos/flipkart.svg",
    //   popular: true,
    // },
    // {
    //   name: "Myntra",
    //   logo: "/logos/myntra.svg",
    // },
    // {
    //   name: "Meesho",
    //   logo: "/logos/meesho.svg",
    // },
    // {
    //   name: "Snapdeal",
    //   logo: "/logos/snapdeal.svg",
    // },
    // {
    //   name: "Magento",
    //   logo: "/logos/magento.svg",
    // },
    // {
    //   name: "eBay",
    //   logo: "/logos/ebay.svg",
    // },
  ];
  return (
    <Card
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 3,
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Typography fontWeight={500} color="primary.contrastText" mb={2}>
        Start by Connecting Your Store
      </Typography>
      <Grid container spacing={2}>
        {connectedPlatforms.map((platform) => (
          <Grid size={{ md: 3, xs: 12 }} key={platform.name}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                borderRadius: "10px",
                backdropFilter: "blur(12px)",
                transition: "0.3s ease",
                "&:hover": {
                  boxShadow: "0 0 0 2px #6c5989",
                },
              }}
            >
              {platform.component}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
};

export default AllChannelOptions;
