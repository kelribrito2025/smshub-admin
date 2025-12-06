import { getDb } from "./server/db";
import { customers } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

async function testStripeCheckout() {
  console.log("\n=== Testing Stripe Checkout ===\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  // Get first customer
  const result = await db.select().from(customers).limit(1);
  const customer = result[0];

  if (!customer) {
    console.error("❌ No customer found in database");
    return;
  }

  console.log(`✅ Customer found: ${customer.name} (${customer.email})`);
  console.log(`   Balance: R$ ${(customer.balance / 100).toFixed(2)}`);

  // Create checkout session
  console.log("\n📝 Creating Stripe checkout session...");

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Recarga de Saldo",
              description: `Recarga de R$ 10,00`,
            },
            unit_amount: 1000, // R$ 10,00 in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:3000/store?payment=success`,
      cancel_url: `http://localhost:3000/store?payment=cancelled`,
      customer_email: customer.email,
      client_reference_id: customer.id.toString(),
      metadata: {
        customer_id: customer.id.toString(),
        customer_email: customer.email,
        customer_name: customer.name,
        amount: "1000",
      },
    });

    console.log("\n✅ Checkout session created successfully!");
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Checkout URL: ${session.url}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Amount: R$ ${(session.amount_total! / 100).toFixed(2)}`);

    console.log("\n📋 Test Summary:");
    console.log("   ✅ Stripe API connection working");
    console.log("   ✅ Checkout session creation working");
    console.log("   ✅ Ready to test in browser");

    console.log("\n🔗 Next steps:");
    console.log("   1. Open the checkout URL in your browser");
    console.log("   2. Use test card: 4242 4242 4242 4242");
    console.log("   3. Any future date and CVC");
    console.log("   4. Webhook will process payment automatically");

  } catch (error: any) {
    console.error("\n❌ Error creating checkout session:");
    console.error(error.message);
    if (error.raw) {
      console.error("Raw error:", error.raw);
    }
  }
}

testStripeCheckout().catch(console.error);
