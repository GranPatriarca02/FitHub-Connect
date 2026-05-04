package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.javatime.datetime
import org.jetbrains.exposed.sql.javatime.CurrentDateTime

object Posts : IntIdTable("posts") {
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE)
    val content = text("content")
    val likesCount = integer("likes_count").default(0)
    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
}

class Post(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Post>(Posts)

    var user by User referencedOn Posts.userId
    var content by Posts.content
    var likesCount by Posts.likesCount
    var createdAt by Posts.createdAt
    
    // Helper para obtener los likes asociados a este post
    val likes by PostLike referrersOn PostLikes.postId
}

object PostLikes : IntIdTable("post_likes") {
    val postId = reference("post_id", Posts, onDelete = ReferenceOption.CASCADE)
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE)
    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    
    init {
        // Asegurar que un usuario solo pueda dar like una vez por post
        uniqueIndex(postId, userId)
    }
}

class PostLike(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<PostLike>(PostLikes)

    var post by Post referencedOn PostLikes.postId
    var user by User referencedOn PostLikes.userId
    var createdAt by PostLikes.createdAt
}

object Comments : IntIdTable("comments") {
    val postId = reference("post_id", Posts, onDelete = ReferenceOption.CASCADE)
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE)
    val content = text("content")
    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
}

class Comment(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Comment>(Comments)

    var post by Post referencedOn Comments.postId
    var user by User referencedOn Comments.userId
    var content by Comments.content
    var createdAt by Comments.createdAt
}
