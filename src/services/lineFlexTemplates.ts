
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
