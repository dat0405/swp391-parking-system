package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.UserStatusEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class UserStatusEventService {

    private static final long SSE_TIMEOUT = 0L;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(error -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("User status stream connected"));
        } catch (IOException error) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    public void publishUserStatus(UserStatusEvent event) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("USER_STATUS_CHANGED")
                        .data(event));
            } catch (IOException error) {
                emitters.remove(emitter);
            }
        }
    }
}