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

function stripePromiseFor(publishableKey: string) {
  let promise = stripePromiseCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripePromiseCache.set(publishableKey, promise);
  }
  return promise;
}

function ConfirmForm({
  labels,
  returnUrl,
  onSuccess,
  onError,
}: {
  labels: Record<string, string>;
  returnUrl: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
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
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: returnUrl,
      },
    });
    setSubmitting(false);

    if (error) {
      onError(error.message || labels.paymentFailed || "Payment failed.");
      return;
    }

    if (
      paymentIntent?.status === "succeeded" ||
      paymentIntent?.status === "processing"
    ) {
      onSuccess();
      return;
    }

    onError(labels.paymentFailed || "Payment did not complete. Try again.");
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
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
  onSuccess,
  onError,
}: {
  clientSecret: string;
  publishableKey: string;
  returnUrl: string;
  labels: Record<string, string>;
  onSuccess: () => void;
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
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
