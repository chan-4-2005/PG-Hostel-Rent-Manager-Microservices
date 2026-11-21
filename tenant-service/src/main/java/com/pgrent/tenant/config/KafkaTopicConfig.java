package com.pgrent.tenant.config;

import com.pgrent.common.events.Topics;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    /** Spring creates this topic on startup if it does not exist yet. */
    @Bean
    NewTopic tenantCheckedOutTopic() {
        return TopicBuilder.name(Topics.TENANT_CHECKED_OUT).partitions(1).replicas(1).build();
    }
}
