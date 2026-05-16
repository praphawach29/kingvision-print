
/**
 * Templates for LINE Flex Messages
 */

export const lineFlexTemplates = {
  /**
   * New Order Flex Message Template
   */
  newOrder: (orderId: string, total: number, customerName: string, items: any[] = []) => {
    return {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://picsum.photos/seed/order/1000/600",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
        action: {
          type: "uri",
          uri: "http://linecorp.com/"
        }
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "มีออเดอร์ใหม่เข้ามา!",
            weight: "bold",
            size: "xl",
            color: "#0f1d33"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "รหัสออเดอร์",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: `#${orderId}`,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 5,
                    weight: "bold"
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "ลูกค้า",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: customerName,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 5
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "ยอดรวม",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: `฿${total.toLocaleString()}`,
                    wrap: true,
                    color: "#eb6c00",
                    size: "md",
                    flex: 5,
                    weight: "bold"
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#0f1d33",
            action: {
              type: "uri",
              label: "ดูรายละเอียดออเดอร์",
              uri: "https://kingvision.app/admin/orders"
            }
          }
        ],
        flex: 0
      }
    };
  },

  /**
   * Low Stock Flex Message Template
   */
  lowStock: (productName: string, currentStock: number) => {
    return {
      type: "bubble",
      styles: {
        header: {
          backgroundColor: "#ff4d4f"
        }
      },
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "⚠️ คำเตือน: สต็อกต่ำ",
            weight: "bold",
            color: "#ffffff",
            size: "md"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: productName,
            weight: "bold",
            size: "md",
            wrap: true,
            color: "#0f1d33"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            contents: [
              {
                type: "text",
                text: "จำนวนคงเหลือปัจจุบัน:",
                size: "sm",
                color: "#888888"
              },
              {
                type: "text",
                text: `${currentStock} ชิ้น`,
                size: "xl",
                weight: "bold",
                color: "#ff4d4f",
                margin: "sm"
              }
            ]
          },
          {
            type: "text",
            text: "กรุณาเติมสต็อกสินค้าโดยด่วนเพื่อให้การขายไม่สะดุด",
            size: "xs",
            color: "#aaaaaa",
            margin: "md",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "ไปที่หน้าจัดการสต็อก",
              uri: "https://kingvision.app/admin/inventory"
            },
            style: "link",
            color: "#eb6c00"
          }
        ]
      }
    };
  },

  /**
   * Payment Slip Notification — sent to admin when customer uploads a slip
   * Footer has postback buttons: ✅ ยืนยัน / ❌ ปฏิเสธ
   */
  paymentSlip: (orderId: string, orderRef: string, total: number, customerName: string, slipUrl: string, paymentMethod: string) => {
    const methodLabel: Record<string, string> = {
      promptpay: 'พร้อมเพย์', qr: 'พร้อมเพย์',
      bank_transfer: 'โอนเงินธนาคาร', transfer: 'โอนเงินธนาคาร',
    };
    return {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#f97316', paddingAll: 'md',
        contents: [
          { type: 'text', text: '💰 แจ้งชำระเงินใหม่!', color: '#ffffff', weight: 'bold', size: 'lg' },
          { type: 'text', text: `ออเดอร์ #${orderRef}`, color: '#fff7ed', size: 'xs' },
        ],
      },
      hero: {
        type: 'image', url: slipUrl, size: 'full',
        aspectRatio: '4:3', aspectMode: 'cover',
        action: { type: 'uri', label: 'ดูสลิป', uri: slipUrl },
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: 'lg',
        contents: [
          {
            type: 'box', layout: 'baseline', spacing: 'sm',
            contents: [
              { type: 'text', text: 'ลูกค้า', color: '#aaaaaa', size: 'sm', flex: 3 },
              { type: 'text', text: customerName, wrap: true, color: '#0f1d33', size: 'sm', flex: 7, weight: 'bold' },
            ],
          },
          {
            type: 'box', layout: 'baseline', spacing: 'sm',
            contents: [
              { type: 'text', text: 'ยอดรวม', color: '#aaaaaa', size: 'sm', flex: 3 },
              { type: 'text', text: `฿${total.toLocaleString()}`, color: '#f97316', size: 'md', flex: 7, weight: 'bold' },
            ],
          },
          {
            type: 'box', layout: 'baseline', spacing: 'sm',
            contents: [
              { type: 'text', text: 'ช่องทาง', color: '#aaaaaa', size: 'sm', flex: 3 },
              { type: 'text', text: methodLabel[paymentMethod] || paymentMethod, color: '#333', size: 'sm', flex: 7 },
            ],
          },
        ],
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm', paddingAll: 'md',
        contents: [
          {
            type: 'button', style: 'primary', color: '#16a34a', flex: 1,
            action: {
              type: 'postback', label: '✅ ยืนยัน',
              data: `action=confirm_payment&orderId=${orderId}&orderRef=${orderRef}`,
              displayText: `ยืนยันการชำระเงิน #${orderRef}`,
            },
          },
          {
            type: 'button', style: 'primary', color: '#dc2626', flex: 1,
            action: {
              type: 'postback', label: '❌ ปฏิเสธ',
              data: `action=reject_payment&orderId=${orderId}&orderRef=${orderRef}`,
              displayText: `ปฏิเสธการชำระเงิน #${orderRef}`,
            },
          },
        ],
      },
    };
  },

  /**
   * Shipped / Tracking Number notification — sent to customer via LINE push
   */
  shippedCustomer: (orderRef: string, trackingNumber: string, shippingProvider: string, customerName: string, siteUrl: string = 'https://kingvision-print.vercel.app') => {
    const providerLabel = shippingProvider || 'ผู้ให้บริการขนส่ง';
    return {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#7c3aed', paddingAll: 'md',
        contents: [
          { type: 'text', text: '📦 สินค้าถูกจัดส่งแล้ว!', color: '#ffffff', weight: 'bold', size: 'lg' },
          { type: 'text', text: `ออเดอร์ #${orderRef}`, color: '#ede9fe', size: 'xs' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: `สวัสดีคุณ${customerName} ครับ/ค่ะ`,
            color: '#0f1d33', size: 'sm', wrap: true,
          },
          {
            type: 'text',
            text: 'สินค้าของคุณได้ถูกจัดส่งเรียบร้อยแล้ว ✨',
            color: '#555555', size: 'sm', wrap: true,
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'box', layout: 'baseline', spacing: 'sm', margin: 'md',
            contents: [
              { type: 'text', text: 'ขนส่ง', color: '#aaaaaa', size: 'sm', flex: 3 },
              { type: 'text', text: providerLabel, color: '#0f1d33', size: 'sm', flex: 7, weight: 'bold' },
            ],
          },
          {
            type: 'box', layout: 'baseline', spacing: 'sm',
            contents: [
              { type: 'text', text: 'เลขพัสดุ', color: '#aaaaaa', size: 'sm', flex: 3 },
              { type: 'text', text: trackingNumber, color: '#7c3aed', size: 'sm', flex: 7, weight: 'bold' },
            ],
          },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: 'md',
        contents: [
          {
            type: 'button', style: 'primary', color: '#7c3aed',
            action: { type: 'uri', label: '🔍 ตรวจสอบสถานะ', uri: `${siteUrl}/account?tab=orders` },
          },
        ],
      },
    };
  },

  /**
   * Status Update Flex Message Template (Can be used for customers)
   */
  statusUpdate: (orderId: string, statusLabel: string, color: string = "#eb6c00") => {
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "อัปเดตสถานะออเดอร์",
            weight: "bold",
            color: "#0f1d33",
            size: "sm"
          },
          {
            type: "text",
            text: `#${orderId}`,
            weight: "bold",
            size: "xxl",
            margin: "md",
            color: "#0f1d33"
          },
          {
            type: "separator",
            margin: "xxl"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "xxl",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "สถานะปัจจุบัน",
                    size: "sm",
                    color: "#555555",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: statusLabel,
                    size: "sm",
                    color: color,
                    align: "end",
                    weight: "bold"
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "ตรวจสอบสถานะ",
              uri: "https://kingvision.app/track-order"
            },
            style: "primary",
            color: "#0f1d33"
          }
        ]
      }
    };
  }
};
