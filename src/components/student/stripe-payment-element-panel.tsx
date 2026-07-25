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
  onFallbackCheckout: () => void;
}

function ConfirmForm({
  labels,
  onSuccess,
  onError,
  onFallbackCheckout,
}: ConfirmFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) {
      onFallbackCheckout();
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
      if (
        error.type === "validation_error" ||
        error.type === "card_error"
      ) {
        onError(error.message ?? labels.topUpFailed ?? "Payment failed.");
        return;
      }
      onError(error.message ?? labels.topUpFailed ?? "Payment failed.");
      onFallbackCheckout();
      return;
    }

    if (
      paymentIntent?.status === "succeeded" ||
      paymentIntent?.status === "processing"
    ) {
      onSuccess();
      return;
    }

    onFallbackCheckout();
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
  onFallbackCheckout: () => void;
}

export function StripePaymentElementPanel({
  clientSecret,
  publishableKey,
  labels,
  onSuccess,
  onError,
  onFallbackCheckout,
}: StripePaymentElementPanelProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">
          {labels.topUpElementUnavailable ??
            "Inline card form could not load. Continue to Stripe Checkout."}
        </p>
        <Button size="sm" type="button" onClick={onFallbackCheckout}>
          {labels.topUpPayCheckout ?? "Open Stripe Checkout"}
        </Button>
      </div>
    );
  }

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
      <ConfirmForm
        labels={labels}
        onSuccess={onSuccess}
        onError={(message) => {
          onError(message);
        }}
        onFallbackCheckout={() => {
          setLoadFailed(true);
          onFallbackCheckout();
        }}
      />
    </Elements>
  );
}
