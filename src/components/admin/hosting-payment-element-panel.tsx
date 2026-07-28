"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui";

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();
const PAY_TIMEOUT_MS = 90_000;

function stripePromiseFor(publishableKey: string) {
  let promise = stripePromiseCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripePromiseCache.set(publishableKey, promise);
  }
  return promise;
}

interface ConfirmFormProps {
  labels: Record<string, string>;
  returnUrl: string;
  billingName: string;
  billingEmail: string | null;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}

function ConfirmForm({
  labels,
  returnUrl,
  billingName,
  billingEmail,
  onSuccess,
  onError,
}: ConfirmFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) {
      onError(
        labels.paymentUnavailable ||
          "Card form is still loading. Try again in a moment.",
      );
      return;
    }

    setSubmitting(true);
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      setSubmitting(false);
      onError(
        labels.paymentTimeout ||
          "Payment is taking too long. Check your bank prompt or try again.",
      );
    }, PAY_TIMEOUT_MS);

    try {
      const { error: submitError } = await elements.submit();
      if (timedOut) return;
      if (submitError) {
        onError(
          submitError.message ||
            labels.paymentFailed ||
            "Check your card details and try again.",
        );
        return;
      }

      // Required when Payment Element hides billing fields (fields: never).
      const billingDetails = {
        name: billingName.trim() || "NextGenMove",
        email: billingEmail?.trim() || "admin@nextgenmove.agency",
        phone: "",
        address: {
          line1: "Dubai",
          city: "Dubai",
          state: "DU",
          postal_code: "00000",
          country: "AE",
        },
      };

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: billingDetails,
          },
        },
      });
      if (timedOut) return;

      if (error) {
        onError(error.message || labels.paymentFailed || "Payment failed.");
        return;
      }

      if (
        paymentIntent?.status === "succeeded" ||
        paymentIntent?.status === "processing"
      ) {
        onSuccess(paymentIntent.id);
        return;
      }

      if (paymentIntent?.status === "requires_action") {
        onError(
          labels.paymentActionRequired ||
            "Complete the verification prompt from your bank, then try again.",
        );
        return;
      }

      onError(labels.paymentFailed || "Payment did not complete. Try again.");
    } catch (error) {
      if (timedOut) return;
      onError(
        error instanceof Error
          ? error.message
          : labels.paymentFailed || "Payment failed.",
      );
    } finally {
      window.clearTimeout(timeoutId);
      if (!timedOut) setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card"],
          fields: {
            billingDetails: {
              name: "never",
              email: "never",
              phone: "never",
              address: "never",
            },
          },
          wallets: {
            applePay: "never",
            googlePay: "never",
            link: "never",
          },
          terms: {
            card: "never",
          },
        }}
      />
      <Button
        type="button"
        className="w-full"
        disabled={!stripe || !elements || submitting}
        onClick={() => void pay()}
      >
        {submitting
          ? labels.paying || "Paying…"
          : labels.payNow || "Pay now"}
      </Button>
    </div>
  );
}

export function HostingPaymentElementPanel({
  clientSecret,
  publishableKey,
  returnUrl,
  labels,
  billingName,
  billingEmail,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  publishableKey: string;
  returnUrl: string;
  labels: Record<string, string>;
  billingName: string;
  billingEmail: string | null;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <Elements
      stripe={stripePromiseFor(publishableKey)}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#3C3489",
            colorBackground: "#FFFFFF",
            colorText: "#1A1A18",
            colorDanger: "#8B3A3A",
            borderRadius: "8px",
            fontFamily: "Inter, system-ui, sans-serif",
          },
        },
      }}
    >
      <ConfirmForm
        labels={labels}
        returnUrl={returnUrl}
        billingName={billingName}
        billingEmail={billingEmail}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
