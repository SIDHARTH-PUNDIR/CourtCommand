CREATE DATABASE  IF NOT EXISTS `court_command` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `court_command`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: court_command
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `game_events`
--

DROP TABLE IF EXISTS `game_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `team_name` varchar(255) DEFAULT NULL,
  `player_id` int DEFAULT NULL,
  `event_type` enum('2PT_MAKE','2PT_MISS','3PT_MAKE','3PT_MISS','FT_MAKE','FT_MISS','REBOUND','ASSIST','STEAL','BLOCK','TURNOVER','FOUL','TIMEOUT') NOT NULL,
  `game_clock` varchar(10) DEFAULT NULL,
  `quarter` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `match_id` (`match_id`),
  KEY `player_id` (`player_id`),
  CONSTRAINT `game_events_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `tournament_matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `game_events_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_events`
--

LOCK TABLES `game_events` WRITE;
/*!40000 ALTER TABLE `game_events` DISABLE KEYS */;
INSERT INTO `game_events` VALUES (1,9,'SEC',17,'2PT_MAKE','11:45',1,'2026-03-22 06:44:20'),(2,9,'sasd',28,'FOUL','11:30',1,'2026-03-22 06:44:20'),(28,224,'sasd',NULL,'REBOUND','09:39',1,'2026-04-26 17:24:23'),(29,224,'sasd',NULL,'2PT_MAKE','09:33',1,'2026-04-26 17:24:29'),(30,224,'sasd',NULL,'2PT_MAKE','10:00',1,'2026-04-28 06:50:23'),(31,224,'sasd',NULL,'2PT_MAKE','10:00',1,'2026-04-29 13:38:57'),(32,224,'Test Squad',NULL,'2PT_MAKE','10:00',1,'2026-04-29 13:39:03'),(33,224,'sasd',NULL,'2PT_MAKE','09:43',1,'2026-04-29 13:39:36'),(34,224,'sasd',NULL,'2PT_MAKE','09:33',1,'2026-04-29 13:39:46'),(35,224,'sasd',NULL,'BLOCK','09:21',1,'2026-04-29 13:39:58'),(36,224,'Test Squad',NULL,'2PT_MAKE','09:08',1,'2026-04-29 13:40:11'),(37,224,'Test Squad',NULL,'2PT_MAKE','08:59',1,'2026-04-29 13:40:20'),(38,224,'Test Squad',NULL,'2PT_MAKE','08:46',1,'2026-04-29 13:40:34'),(39,224,'Test Squad',NULL,'REBOUND','08:44',1,'2026-04-29 13:40:35'),(40,224,'sasd',NULL,'2PT_MAKE','09:48',1,'2026-04-29 13:46:51'),(41,224,'sasd',NULL,'2PT_MAKE','09:43',1,'2026-04-29 13:46:56'),(42,224,'Test Squad',NULL,'2PT_MAKE','09:34',1,'2026-04-29 13:47:05'),(43,224,'Test Squad',NULL,'REBOUND','09:32',1,'2026-04-29 13:47:07'),(44,224,'Test Squad',NULL,'2PT_MAKE','09:20',1,'2026-04-29 13:47:19'),(45,224,'Test Squad',NULL,'BLOCK','09:19',1,'2026-04-29 13:47:20');
/*!40000 ALTER TABLE `game_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_match_stats`
--

DROP TABLE IF EXISTS `player_match_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_match_stats` (
  `match_id` int NOT NULL,
  `player_id` int NOT NULL,
  `points` int DEFAULT '0',
  `fouls` int DEFAULT '0',
  `assists` int DEFAULT '0',
  `rebounds` int DEFAULT '0',
  `steals` int DEFAULT '0',
  `blocks` int DEFAULT '0',
  `seconds_played` int DEFAULT '0',
  PRIMARY KEY (`match_id`,`player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_match_stats`
--

LOCK TABLES `player_match_stats` WRITE;
/*!40000 ALTER TABLE `player_match_stats` DISABLE KEYS */;
INSERT INTO `player_match_stats` VALUES (224,27,2,0,0,0,0,0,11),(224,28,3,0,0,0,0,0,15),(224,29,2,0,0,1,0,0,25),(224,30,2,0,0,0,0,0,61),(224,31,2,0,0,0,0,1,35),(901,29,85,0,22,40,0,0,0),(901,32,80,0,19,38,0,0,0),(902,29,72,0,18,35,0,0,0),(902,32,90,0,24,42,0,0,0),(903,29,95,0,26,45,0,0,0),(903,32,88,0,20,39,0,0,0),(904,29,105,0,30,42,0,0,0),(904,34,98,0,25,38,0,0,0),(905,29,88,0,15,30,0,0,0),(905,36,95,0,22,45,0,0,0),(906,29,110,0,28,35,0,0,0),(906,34,112,0,29,36,0,0,0),(907,34,100,0,24,40,0,0,0),(907,36,90,0,18,32,0,0,0);
/*!40000 ALTER TABLE `player_match_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL,
  `team` varchar(255) NOT NULL,
  `image` text,
  `position` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `players`
--

LOCK TABLES `players` WRITE;
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` VALUES (17,'Sidharth','Player','SEC','/assets/players/1773854944371-player5.jpeg','PG'),(18,'PUNDIR','Player','SEC','/assets/players/player2.jpeg','SG'),(27,'PUNDIR','Player','sasd','/assets/players/couch.jpeg','PG'),(28,'akshat','Player','sasd','/assets/players/1773854881025-player3.avif','SG'),(29,'Helmond','Player','Test Squad','/assets/players/1774164414334-inosuke-hashibira-5120x2880-23650.jpg.jpeg','PG'),(30,'Liam Chen','Captain','test squad',NULL,'PG'),(31,'Marcus Miller','Player','test squad',NULL,'PF'),(32,'John Doe','Captain','Rival Squad',NULL,'PG'),(33,'Jane Smith','Player','Rival Squad',NULL,'C'),(34,'Alex Hunter','Captain','Alpha Wolves',NULL,'PG'),(35,'Zack Ryder','Player','Alpha Wolves',NULL,'C'),(36,'Leon Vance','Captain','Neon Knights',NULL,'SG'),(37,'Trey Evans','Player','Neon Knights',NULL,'PF');
/*!40000 ALTER TABLE `players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_matches`
--

DROP TABLE IF EXISTS `tournament_matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int DEFAULT NULL,
  `teama` varchar(255) DEFAULT NULL,
  `teamb` varchar(255) DEFAULT NULL,
  `scorea` int DEFAULT '0',
  `scoreb` int DEFAULT '0',
  `status` varchar(20) DEFAULT 'UPCOMING',
  `match_date` date DEFAULT NULL,
  `round` varchar(50) DEFAULT NULL,
  `winner` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`),
  CONSTRAINT `tournament_matches_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=908 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_matches`
--

LOCK TABLES `tournament_matches` WRITE;
/*!40000 ALTER TABLE `tournament_matches` DISABLE KEYS */;
INSERT INTO `tournament_matches` VALUES (8,5,'ank','vis',0,0,'UPCOMING',NULL,'SEMI FINAL',NULL),(9,5,'SEC','sasd',42,50,'LIVE',NULL,'SEMI FINAL',NULL),(222,7,'Test squad 1','BYE',0,0,'UPCOMING',NULL,'ROUND 1',NULL),(223,7,'ank','vis',0,0,'UPCOMING',NULL,'ROUND 1',NULL),(224,7,'sasd','Test Squad',5,4,'LIVE','2026-04-26','ROUND 1',NULL),(225,7,'SEC','BYE',0,0,'UPCOMING',NULL,'ROUND 1',NULL),(226,7,'Test squad 1','TBD',0,0,'UPCOMING',NULL,'SEMI FINAL',NULL),(227,7,'TBD','TBD',0,0,'UPCOMING',NULL,'SEMI FINAL',NULL),(228,7,'TBD','TBD',0,0,'UPCOMING',NULL,'FINAL',NULL),(901,999,'test squad','Rival Squad',85,80,'FINAL','2026-04-10',NULL,'test squad'),(902,999,'test squad','Rival Squad',72,90,'FINAL','2026-04-12',NULL,'Rival Squad'),(903,999,'test squad','Rival Squad',95,88,'FINAL','2026-04-15',NULL,'test squad'),(904,1001,'test squad','Alpha Wolves',105,98,'FINAL','2026-06-05',NULL,'test squad'),(905,1001,'test squad','Neon Knights',88,95,'FINAL','2026-06-10',NULL,'Neon Knights'),(906,1002,'test squad','Alpha Wolves',110,112,'FINAL','2026-12-05',NULL,'Alpha Wolves'),(907,1002,'Alpha Wolves','Neon Knights',100,90,'FINAL','2026-12-10',NULL,'Alpha Wolves');
/*!40000 ALTER TABLE `tournament_matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_teams`
--

DROP TABLE IF EXISTS `tournament_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int DEFAULT NULL,
  `team_name` varchar(255) DEFAULT NULL,
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `matches_played` int DEFAULT '0',
  `wins` int DEFAULT '0',
  `losses` int DEFAULT '0',
  `points` int DEFAULT '0',
  `ties` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`),
  CONSTRAINT `tournament_teams_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_teams`
--

LOCK TABLES `tournament_teams` WRITE;
/*!40000 ALTER TABLE `tournament_teams` DISABLE KEYS */;
INSERT INTO `tournament_teams` VALUES (1,1,'SEC','2026-03-22 06:44:20',0,0,0,0,0),(2,1,'sasd','2026-03-22 06:44:20',0,0,0,0,0),(11,5,'ank','2026-03-22 06:44:20',0,0,0,0,0),(12,5,'vis','2026-03-22 06:44:20',0,0,0,0,0),(13,5,'SEC','2026-03-22 06:44:20',0,0,0,0,0),(14,5,'sasd','2026-03-22 06:44:20',0,0,0,0,0),(19,7,'SEC','2026-03-22 14:10:07',0,0,0,0,0),(20,7,'ank','2026-03-22 14:10:16',0,0,0,0,0),(21,7,'sasd','2026-03-22 14:10:19',0,0,0,0,0),(22,7,'Test squad 1','2026-03-22 14:10:26',0,0,0,0,0),(23,7,'Test Squad','2026-03-22 14:10:31',0,0,0,0,0),(25,7,'vis','2026-03-22 15:00:59',0,0,0,0,0);
/*!40000 ALTER TABLE `tournament_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `max_teams` int DEFAULT '8',
  `status` varchar(20) DEFAULT 'UPCOMING',
  `image` varchar(200) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `champion` varchar(255) DEFAULT NULL,
  `runner_up` varchar(255) DEFAULT NULL,
  `second_runner_up` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `tournaments_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1003 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` VALUES (1,'Spring Cup','Graphic Era Hill, Bheem Tal','2026-03-01','2026-03-31',8,'ONGOING','/assets/tournaments/spring.png',NULL,NULL,NULL,NULL),(2,'Summer League','Graphic Era Hill, Haldwani','2026-06-01','2026-06-30',8,'UPCOMING','/assets/tournaments/summer.png',NULL,NULL,NULL,NULL),(5,'akshat','dehradun','2026-03-03','2026-04-14',8,'UPCOMING','/assets/tournaments/1773926483213-photo-1646625753091-de94be5cfc32.avif',5,NULL,NULL,NULL),(7,'Spring Days','Dehradun','2026-03-22','2026-03-31',32,'ACTIVE','/assets/tournaments/1774188430972-NewReadmeBanner.png',10,NULL,NULL,NULL),(999,'AI Simulator Cup','Test Arena','2026-04-01',NULL,8,'UPCOMING',NULL,NULL,NULL,NULL,NULL),(1001,'Summer Clash','Downtown Court','2026-06-01',NULL,8,'UPCOMING',NULL,NULL,NULL,NULL,NULL),(1002,'Winter Showdown','City Arena','2026-12-01',NULL,8,'UPCOMING',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `team` varchar(255) DEFAULT NULL,
  `password` text NOT NULL,
  `is_admin` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (4,'Admin','sidharthpundir07@gmail.com','ADMIN','$2b$10$7D5O1eJ1fCZRIM8OCvDabuETT5TwWpRt2cDmAhPXoVLMhXYby.wc.',1),(5,'sidharth','sidharthpundir11@gmail.com','SEC','$2b$10$dzighWHXJ7UPtDRMwUV7q.rpfCLc0isVi7Rrm0KBiJne0G6KNaWXq',0),(6,'akshat','akshat@gmail.com','sasd','$2b$10$qIqzeYs08f0K0sy9Re4N2OZI3I5LDuDJMueirYkExk0AclXwyxeDe',0),(7,'ankush','ankush@gmail.com','ank','$2b$10$5cOAj2W2/1SdADeG5vsvmuqMS2OX/rRVklySBaPFqGpv45bZZAEwO',0),(8,'VISHAL','vishal@gmail.com','vis','$2b$10$iY/PNWuNiRmK4.IKzVjxfef1A3L1LxX8emmgxTW7Tc0gHhecz5XNK',0),(9,'Tester','test@courtcommand.com','Test Squad','$2b$10$8BmzNK.7wJa1wNjjh3zpZepw0nXhpqhyZxAYFifAqfOD2aRrYk7IS',1),(10,'Tester1','test1@courtcommand.com','Test squad 1','$2b$10$CZzmNcKXEkGVO7h2iPjyheqtJMzdJ83qvENPjczXShiQZbFg/fSNq',0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-29 19:41:43
