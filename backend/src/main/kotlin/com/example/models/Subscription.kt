package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.javatime.datetime
import org.jetbrains.exposed.sql.javatime.CurrentDateTime

// Definición de los estados de la suscripción
enum class SubscriptionStatus {
    ACTIVE,
    CANCELLED,
    EXPIRED
}

// Definición de la Tabla en la Base de Datos
object Subscriptions : IntIdTable("subscriptions") {
    // Relación con el Alumno (Tabla Users)
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE)
    
    // Relación con el Monitor (Tabla Monitors)
    val monitorId = reference("monitor_id", Monitors, onDelete = ReferenceOption.CASCADE)
    
    // Estado y fechas
    val status = enumerationByName("status", 20, SubscriptionStatus::class)
        .default(SubscriptionStatus.ACTIVE)
    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val expiresAt = datetime("expires_at").nullable()
    
    // Identificador de pago (opcional)
    val paymentId = varchar("payment_id", 255).nullable()
}

// Entidad DAO (Para manipular los datos en el código)
class Subscription(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Subscription>(Subscriptions)

    // Estas variables permiten acceder a los datos fácilmente
    var user      by User      referencedOn Subscriptions.userId
    var monitor   by Monitor   referencedOn Subscriptions.monitorId
    var status    by Subscriptions.status
    var createdAt by Subscriptions.createdAt
    var expiresAt by Subscriptions.expiresAt
    var paymentId by Subscriptions.paymentId
}