package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.entity.Booking;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.payos.PayOS;

import java.lang.reflect.Method;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PayOSPaymentLinkManager {

    private final PayOS payOS;

    /*
     * payOS Java SDK 2.x has changed the exact typed cancel method between
     * releases. This manager first tries the typed paymentRequests service,
     * then falls back to the SDK generic POST helper.
     *
     * Cancellation failure must not prevent the local booking from being
     * cancelled. The PayOS link also receives expiredAt when it is created,
     * and the webhook refuses to confirm late/cancelled bookings.
     */
    public void cancelPaymentLinkSilently(
            Booking booking,
            String reason
    ) {
        if (booking == null
                || booking.getPaymentOrderCode() == null) {
            return;
        }

        try {
            if (tryTypedCancel(
                    booking.getPaymentOrderCode(),
                    reason
            )) {
                return;
            }

            if (tryGenericPostCancel(
                    booking.getPaymentOrderCode(),
                    reason
            )) {
                return;
            }

            System.out.println(
                    "PayOS cancellation method was not found. orderCode="
                            + booking.getPaymentOrderCode()
            );
        } catch (Exception exception) {
            System.out.println(
                    "PayOS payment-link cancellation failed. orderCode="
                            + booking.getPaymentOrderCode()
                            + ", message="
                            + exception.getMessage()
            );
        }
    }

    private boolean tryTypedCancel(
            Long orderCode,
            String reason
    ) throws Exception {
        Object paymentRequests =
                payOS.paymentRequests();

        for (Method method :
                paymentRequests.getClass().getMethods()) {

            String methodName =
                    method.getName().toLowerCase();

            if (!methodName.contains("cancel")) {
                continue;
            }

            Class<?>[] parameterTypes =
                    method.getParameterTypes();

            if (parameterTypes.length == 2
                    && isOrderCodeType(
                    parameterTypes[0]
            )
                    && parameterTypes[1]
                    .equals(String.class)) {

                method.invoke(
                        paymentRequests,
                        convertOrderCode(
                                orderCode,
                                parameterTypes[0]
                        ),
                        reason
                );

                return true;
            }

            if (parameterTypes.length == 1
                    && isOrderCodeType(
                    parameterTypes[0]
            )) {

                method.invoke(
                        paymentRequests,
                        convertOrderCode(
                                orderCode,
                                parameterTypes[0]
                        )
                );

                return true;
            }

            if (parameterTypes.length == 2
                    && isOrderCodeType(
                    parameterTypes[0]
            )) {
                Object requestBody =
                        buildCancellationRequest(
                                parameterTypes[1],
                                reason
                        );

                if (requestBody != null) {
                    method.invoke(
                            paymentRequests,
                            convertOrderCode(
                                    orderCode,
                                    parameterTypes[0]
                            ),
                            requestBody
                    );

                    return true;
                }
            }
        }

        return false;
    }

    private boolean tryGenericPostCancel(
            Long orderCode,
            String reason
    ) throws Exception {
        for (Method method :
                payOS.getClass().getMethods()) {

            if (!"post".equals(method.getName())) {
                continue;
            }

            Class<?>[] parameterTypes =
                    method.getParameterTypes();

            if (parameterTypes.length != 3
                    || !String.class.equals(
                    parameterTypes[0]
            )
                    || !Class.class.equals(
                    parameterTypes[2]
            )) {
                continue;
            }

            method.invoke(
                    payOS,
                    "/v2/payment-requests/"
                            + orderCode
                            + "/cancel",
                    Map.of(
                            "cancellationReason",
                            reason == null
                                    ? "Booking cancelled"
                                    : reason
                    ),
                    Object.class
            );

            return true;
        }

        return false;
    }

    private Object buildCancellationRequest(
            Class<?> requestClass,
            String reason
    ) {
        try {
            Method builderMethod =
                    requestClass.getMethod(
                            "builder"
                    );

            Object builder =
                    builderMethod.invoke(null);

            Method reasonMethod =
                    builder.getClass()
                            .getMethod(
                                    "cancellationReason",
                                    String.class
                            );

            reasonMethod.invoke(
                    builder,
                    reason
            );

            return builder.getClass()
                    .getMethod("build")
                    .invoke(builder);
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isOrderCodeType(
            Class<?> type
    ) {
        return type.equals(Long.class)
                || type.equals(long.class)
                || type.equals(String.class);
    }

    private Object convertOrderCode(
            Long orderCode,
            Class<?> targetType
    ) {
        if (String.class.equals(targetType)) {
            return String.valueOf(orderCode);
        }

        return orderCode;
    }
}
