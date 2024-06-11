import Stripe from "stripe"

export default async ({ res, log, error }) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY)

  async function fetchPaymentLinks(pageParam = {}) {
    let paymentLinks = []
    let hasMore = true

    while (hasMore) {
      try {
        const response = await stripe.paymentLinks.list({
          limit: 100,
          starting_after: pageParam.startingAfter,
        })

        paymentLinks = paymentLinks.concat(response.data)
        hasMore = response.has_more

        if (hasMore && response.data.length > 0) {
          pageParam.startingAfter = response.data[response.data.length - 1].id
        } else {
          hasMore = false
        }
      } catch (err) {
        throw new Error(`Error fetching data from Stripe API: ${err.message}`)
      }
    }

    return paymentLinks
  }

  async function fetchLineItems(paymentLinkId) {
    try {
      const lineItems = await stripe.paymentLinks.listLineItems(paymentLinkId, {
        limit: 100,
      })
      log(lineItems)
      return lineItems.data
    } catch (err) {
      error(err.message)
      throw new Error(
        `Error fetching line items for payment link ${paymentLinkId}: ${err.message}`
      )
    }
  }

  try {
    const allPaymentLinks = await fetchPaymentLinks()

    const paymentLinksWithLineItems = await Promise.all(
      allPaymentLinks.map(async (link) => {
        const lineItems = await fetchLineItems(link.id)
        const productNames = lineItems.map((item) => item.price.product.name)

        return {
          id: link.id,
          url: link.url,
          names: productNames,
          created: link.created,
        }
      })
    )

    return res.json(paymentLinksWithLineItems)
  } catch (err) {
    error(err.message)
    return res.empty()
  }
}
