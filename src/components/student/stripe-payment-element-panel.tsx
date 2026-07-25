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

interface ConfirmFormProps {
  labels: Record<string, string>;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function ConfirmForm({ labels, onSuccess, onError }: ConfirmFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) {
      onError(
        labels.topUpElementUnavailable ??
          "Card form is still loading. Try again in a moment.",
      );
      return;
    }

    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/student/wallet?topup=success`,
      },
    });
    setSubmitting(false);

    if (error) {
      onError(error.message ?? labels.topUpFailed ?? "Payment failed.");
      return;
    }

    if (
      paymentIntent?.status === "succeeded" ||
      paymentIntent?.status === "processing"
    ) {
      onSuccess();
      return;
    }

    onError(labels.topUpFailed ?? "Payment did not complete. Try again.");
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          type="button"
          disabled={!stripe || !elements || submitting}
          onClick={() => void pay()}
        >
          {submitting
            ? (labels.topUpBuying ?? "Paying…")
            : (labels.topUpPayCard ?? "Pay with card")}
        </Button>
      </div>
    </div>
  );
}

export interface StripePaymentElementPanelProps {
  clientSecret: string;
  publishableKey: string;
  labels: Record<string, string>;
  onSuccess: () => void;
  onError: (message: string) => void;
  /** @deprecated Checkout fallback removed — optional no-op for callers. */
  onFallbackCheckout?: () => void;
}

export function StripePaymentElementPanel({
  clientSecret,
  publishableKey,
  labels,
  onSuccess,
  onError,
}: StripePaymentElementPanelProps) {
  return (
    <Elements
      stripe={stripePromiseFor(publishableKey)}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#3C3489",
            borderRadius: "8px",
          },
        },
      }}
    >
      <ConfirmForm labels={labels} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
