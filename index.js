import Stripe from "stripe"

export default async ({ res, log, error }) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY)

  async function fetchPaymentLinks(pageParam = {}) {
    let paymentLinks = []
    let hasMore = true

    while (hasMore) {
      let response
      try {
        response = await stripe.paymentLinks.list({
          limit: 100,
          starting_after: pageParam.startingAfter,
        })
      } catch (err) {
        throw new Error(`Error fetching data from Stripe API: ${err.message}`)
      }

      paymentLinks = paymentLinks.concat(response.data)
      hasMore = response.has_more

      if (hasMore && response.data.length > 0) {
        pageParam.startingAfter = response.data[response.data.length - 1].id
      } else {
        hasMore = false
      }
    }

    return paymentLinks
  }

  try {
    const allPaymentLinks = await fetchPaymentLinks()
    log(allPaymentLinks)
    return res.json(allPaymentLinks)
  } catch (err) {
    error("Error fetching data from Stripe API:", err.message)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
