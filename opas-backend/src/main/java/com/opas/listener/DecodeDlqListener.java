package com.opas.listener;

import com.opas.dto.DecodeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.listener.api.ChannelAwareMessageListener;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.stereotype.Component;

/**
 * Consumes messages from the dead-letter queue. These are decodes that failed after
 * all retry attempts and were nack'd with requeue=false by the primary listener.
 *
 * <p>Current behaviour: log at ERROR with full context so ops can detect systemic
 * failures (e.g. a Presidio outage causing every decode to DLQ). The message is ack'd
 * to remove it from the queue — DLQ messages are not retried automatically. For manual
 * replay, use the RabbitMQ management UI or a requeue binding.
 */
@Component
public class DecodeDlqListener implements ChannelAwareMessageListener {

    private static final Logger log = LoggerFactory.getLogger(DecodeDlqListener.class);

    private final Jackson2JsonMessageConverter messageConverter;

    public DecodeDlqListener(Jackson2JsonMessageConverter messageConverter) {
        this.messageConverter = messageConverter;
    }

    @Override
    public void onMessage(Message message, com.rabbitmq.client.Channel channel) throws Exception {
        DecodeMessage decodeMessage = (DecodeMessage) messageConverter.fromMessage(message);
        long deliveryTag = message.getMessageProperties().getDeliveryTag();

        log.error("DEAD-LETTER: decode permanently failed — userId={}, documentId={}, "
                + "deliveryTag={}. Manual replay required via RabbitMQ management UI.",
                decodeMessage.userId(), decodeMessage.documentId(), deliveryTag);

        channel.basicAck(deliveryTag, false);
    }
}
