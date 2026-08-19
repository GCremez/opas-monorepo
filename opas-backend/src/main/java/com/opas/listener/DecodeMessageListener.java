package com.opas.listener;

import com.opas.dto.DecodeMessage;
import com.opas.service.DecodeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.listener.api.ChannelAwareMessageListener;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.stereotype.Component;

@Component
public class DecodeMessageListener implements ChannelAwareMessageListener {

    private static final Logger log = LoggerFactory.getLogger(DecodeMessageListener.class);

    private final DecodeService decodeService;
    private final Jackson2JsonMessageConverter messageConverter;

    public DecodeMessageListener(DecodeService decodeService, Jackson2JsonMessageConverter messageConverter) {
        this.decodeService = decodeService;
        this.messageConverter = messageConverter;
    }

    @Override
    public void onMessage(Message message, com.rabbitmq.client.Channel channel) throws Exception {
        DecodeMessage decodeMessage = (DecodeMessage) messageConverter.fromMessage(message);
        log.info("Processing decode: userId={}, documentId={}", decodeMessage.userId(), decodeMessage.documentId());
        try {
            decodeService.processDecode(decodeMessage);
            channel.basicAck(message.getMessageProperties().getDeliveryTag(), false);
            log.info("Decode completed: userId={}, documentId={}", decodeMessage.userId(), decodeMessage.documentId());
        } catch (Exception e) {
            log.error("Decode failed: userId={}, documentId={}", decodeMessage.userId(), decodeMessage.documentId(), e);
            try {
                // Mark the document failed and refund the reserved credit. Runs in its
                // own transaction (processDecode's transaction has rolled back by now).
                decodeService.markDecodeFailed(decodeMessage.userId(), decodeMessage.documentId());
            } catch (Exception cleanupError) {
                log.error("Failed to mark decode as failed: documentId={}", decodeMessage.documentId(), cleanupError);
            }
            // requeue=false: route to the dead-letter queue rather than loop forever.
            channel.basicNack(message.getMessageProperties().getDeliveryTag(), false, false);
        }
    }
}
