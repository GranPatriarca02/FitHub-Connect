package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.javatime.datetime
import org.jetbrains.exposed.sql.javatime.CurrentDateTime
import java.time.LocalDateTime

enum class SubscriptionStatus {
    ACTIVE,
    CANCELLED,
    EXPIRED
}

object Subscriptions : IntIdTable("subscriptions") {
    val userId    = reference("user_id",    Users,    onDelete = ReferenceOption.CASCADE)
    val monitorId = reference("monitor_id", Monitors, onDelete = ReferenceOption.CASCADE)
    val status    = enumerationByName("status", 20, SubscriptionStatus::class)
                        .default(SubscriptionStatus.ACTIVE)
    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val expiresAt = datetime("expires_at").nullable()
    val paymentId = varchar("payment_id", 255).nullable()
}

class Subscription(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Subscription>(Subscriptions)

    var user      by User    referencedOn Subscriptions.userId
    var monitor   by Monitor referencedOn Subscriptions.monitorId
    var status    by Subscriptions.status
    var createdAt by Subscriptions.createdAt
    var expiresAt by Subscriptions.expiresAt
    var paymentId by Subscriptions.paymentId
}
