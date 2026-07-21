package com.opas.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
import org.springframework.amqp.rabbit.listener.adapter.MessageListenerAdapter;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_DECODE = "opas.decode";
    public static final String QUEUE_DECODE = "opas.decode.queue";
    public static final String QUEUE_DECODE_DLQ = "opas.decode.dlq";
    public static final String ROUTING_KEY_DECODE = "decode.request";

    @Bean
    public DirectExchange decodeExchange() {
        return new DirectExchange(EXCHANGE_DECODE);
    }

    @Bean
    public Queue decodeQueue() {
        return new Queue(QUEUE_DECODE, true);
    }

    @Bean
    public Queue decodeDlq() {
        return new Queue(QUEUE_DECODE_DLQ, true);
    }

    @Bean
    public Binding decodeBinding(DirectExchange decodeExchange, Queue decodeQueue) {
        return BindingBuilder.bind(decodeQueue).to(decodeExchange).with(ROUTING_KEY_DECODE);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
            Jackson2JsonMessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }

    @Bean
    public SimpleMessageListenerContainer decodeListenerContainer(ConnectionFactory connectionFactory,
            MessageListenerAdapter decodeListenerAdapter) {
        SimpleMessageListenerContainer container = new SimpleMessageListenerContainer(connectionFactory);
        container.setQueueNames(QUEUE_DECODE);
        container.setMessageListener(decodeListenerAdapter);
        container.setPrefetchCount(5);
        container.setConcurrentConsumers(3);
        container.setMaxConcurrentConsumers(10);
        container.setDefaultRequeueRejected(false);
        return container;
    }

    @Bean
    public MessageListenerAdapter decodeListenerAdapter(Object decodeMessageListener) {
        return new MessageListenerAdapter(decodeMessageListener, "onMessage");
    }
}
