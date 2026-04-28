package com.example.services

import com.stripe.Stripe
import com.stripe.model.PaymentIntent
import com.stripe.param.PaymentIntentCreateParams
import io.github.cdimascio.dotenv.dotenv // Importamos la librería
import java.math.BigDecimal

object PaymentService {
    private val dotenv = dotenv() // Inicializamos dotenv

    init {
        // Clave Stripie: https://dashboard.stripe.com
        Stripe.apiKey = dotenv["STRIPE_SECRET_KEY"]
    }

    fun createPaymentIntent(amount: BigDecimal, bookingId: Int, userId: Int): PaymentIntent {
        val params = PaymentIntentCreateParams.builder()
            .setAmount((amount.toDouble() * 100).toLong())
            .setCurrency("eur")
            .putMetadata("bookingId", bookingId.toString())
            .putMetadata("userId", userId.toString())
            .build()

        return PaymentIntent.create(params)
    }
}