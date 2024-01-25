import puppeteer, { Puppeteer } from 'puppeteer'
import tough from 'tough-cookie'

// The purpose of this code is to use Puppeteer (which
// can perform browser automation programatically) to
// 'grab' a crumb value and store its associated session
// cookies in a cookie jar, in order to later allow us
// to make authenticated API requests on the Yahoo Finance API.

export async function getCrumb() {
  try {
    // Launch the browser through Puppeteer
    // and open a new blank page.
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    // Declare the cookie jar and the crumb variables
    // which are ultimately what we are after and
    // what this routine will return.
    const cookieJar = new tough.CookieJar()
    let crumb

    // Declare the event handler that will allow us to
    // grab the sought-after 'crumb' value.
    // This value is returned by an XHR call that
    // contains the path 'getCrumb', so we wait for
    // that call to complete, then store the returned
    // value into the crumb variable.
    page.on('requestfinished', async (req) => {
      if (
        req.resourceType().match(/fetch/) &&
        req.url().includes('getcrumb') &&
        req.method() !== 'OPTIONS'
      ) {
        crumb = await req.response().text()
      }
    })

    // Navigate the page to a Yahoo Finance.
    await page.goto('https://finance.yahoo.com')

    // Pre-cookie state screengrab (debug).
    // await page.screenshot({ path: 'step1.png' })

    // Navigating to Yahoo Finance will trigger
    // the display of a cookie acceptance dialog.
    // We therefore need to handle/dismiss this dialog.
    // First we make sure the rejection button is visible
    // (this infers the entire dialog is displayed).
    await page.waitForSelector('.reject-all')
    // Then we wait for the promises that will be triggered
    // by our action to resolve.
    await Promise.all([
      // We click on the cookie dialog rejection button, which
      // will indirectly cause navigation to a new page.
      page.click('.reject-all'),
      // This promise resolves after navigation
      // to the new page has completed.
      page.waitForNavigation({ timeout: 0 }),
    ])

    // Because the crumb is paired with a session cookie,
    // we want to make sure we store the relevant cookie(s)
    // into our cookie jar, which we will ultimately return
    // along with the crumb.
    const cookies = await page.cookies()
    await Promise.all([
      cookies.map(async (cookie) => {
        cookieJar.setCookie(
          // There is a slight format discrepancy between
          // the cookies being returned through Puppeteer
          // and the expect format when making requests,
          // so we make sure each cookie is properly formatted:
          // - 'name' becomes 'key'
          // - 'expires' needs to be set to 'Infinity' or
          //   a proper javascript Date object
          // - if present, remove the leading '.' from
          //   the 'domain' key.
          new tough.Cookie({
            ...cookie,
            key: cookie.name,
            expires:
              cookie.expires === -1
                ? 'Infinity'
                : new Date(Math.round(cookie.expires * 1000)),
            domain: cookie.domain.startsWith('.')
              ? cookie.domain.slice(1)
              : cookie.domain,
          }),
          'https://finance.yahoo.com',
        )
      }),
    ])

    // We are done, close the Puppeteer browser instance
    // and return our crumb/cookieJar pair.
    await browser.close()
    return {
      crumb,
      cookieJar,
    }
  } catch (error) {
    throw error
  }
}
