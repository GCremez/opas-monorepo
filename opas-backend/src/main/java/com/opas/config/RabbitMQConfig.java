package com.opas.config;

import org.springframework.amqp.core.AcknowledgeMode;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.opas.listener.DecodeDlqListener;
import com.opas.listener.DecodeMessageListener;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_DECODE = "opas.decode";
    public static final String EXCHANGE_DECODE_DLQ = "opas.decode.dlx";
    public static final String QUEUE_DECODE = "opas.decode.queue";
    public static final String QUEUE_DECODE_DLQ = "opas.decode.dlq";
    public static final String ROUTING_KEY_DECODE = "decode.request";
    public static final String ROUTING_KEY_DECODE_DLQ = "decode.dead";

    @Bean
    public DirectExchange decodeExchange() {
        return new DirectExchange(EXCHANGE_DECODE);
    }

    @Bean
    public DirectExchange decodeDlqExchange() {
        return new DirectExchange(EXCHANGE_DECODE_DLQ);
    }

    @Bean
    public Queue decodeQueue() {
        // Rejected messages (basicNack requeue=false) are dead-lettered to the DLQ
        // instead of being discarded, so failed decodes can be inspected and replayed.
        // NOTE: a pre-existing queue without these arguments must be deleted once so it
        // is redeclared with the dead-letter config.
        return org.springframework.amqp.core.QueueBuilder.durable(QUEUE_DECODE)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DECODE_DLQ)
                .withArgument("x-dead-letter-routing-key", ROUTING_KEY_DECODE_DLQ)
                .build();
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
    public Binding decodeDlqBinding(DirectExchange decodeDlqExchange, Queue decodeDlq) {
        return BindingBuilder.bind(decodeDlq).to(decodeDlqExchange).with(ROUTING_KEY_DECODE_DLQ);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        // Restrict deserialization to our own DTOs so a compromised/poisoned broker
        // can't drive the JSON type mapper into instantiating arbitrary classes.
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTrustedPackages("com.opas.dto");
        converter.setJavaTypeMapper(typeMapper);
        return converter;
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
            DecodeMessageListener decodeMessageListener) {
        // decodeMessageListener implements ChannelAwareMessageListener directly (with its
        // own manual ack/nack), so it's registered on the container as-is. Wrapping it in a
        // MessageListenerAdapter here would be wrong: that adapter reflectively invokes the
        // delegate with the *converted message payload* as the argument, not (Message,
        // Channel) - it would never find a matching method and messages would never be
        // processed.
        SimpleMessageListenerContainer container = new SimpleMessageListenerContainer(connectionFactory);
        container.setQueueNames(QUEUE_DECODE);
        container.setMessageListener(decodeMessageListener);
        // The listener acks/nacks itself. Under the default AUTO mode the container would
        // ack the same delivery tag again, and the broker closes the channel on that.
        container.setAcknowledgeMode(AcknowledgeMode.MANUAL);
        container.setPrefetchCount(5);
        container.setConcurrentConsumers(3);
        container.setMaxConcurrentConsumers(10);
        container.setDefaultRequeueRejected(false);
        return container;
    }

    @Bean
    public SimpleMessageListenerContainer decodeDlqListenerContainer(ConnectionFactory connectionFactory,
            DecodeDlqListener decodeDlqListener) {
        SimpleMessageListenerContainer container = new SimpleMessageListenerContainer(connectionFactory);
        container.setQueueNames(QUEUE_DECODE_DLQ);
        container.setMessageListener(decodeDlqListener);
        container.setAcknowledgeMode(AcknowledgeMode.MANUAL);
        container.setConcurrentConsumers(1);
        container.setDefaultRequeueRejected(false);
        return container;
    }
}
