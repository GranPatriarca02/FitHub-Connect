package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.javatime.datetime
import org.jetbrains.exposed.sql.javatime.CurrentDateTime

object Videos : IntIdTable("videos") {
    val title        = varchar("title", 255)
    val description  = text("description").nullable()
    val videoUrl     = varchar("video_url", 1000)
    val thumbnailUrl = varchar("thumbnail_url", 1000).nullable()
    // true = solo PREMIUM y TRAINER pueden verlo
    val isPremium    = bool("is_premium").default(true)
    // null = video curado por la app (oficial FitHub)
    val monitorId    = reference("monitor_id", Monitors).nullable()
    val createdAt    = datetime("created_at").defaultExpression(CurrentDateTime)
}

class Video(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Video>(Videos)

    var title        by Videos.title
    var description  by Videos.description
    var videoUrl     by Videos.videoUrl
    var thumbnailUrl by Videos.thumbnailUrl
    var isPremium    by Videos.isPremium
    var monitor      by Monitor optionalReferencedOn Videos.monitorId
    var createdAt    by Videos.createdAt
}
