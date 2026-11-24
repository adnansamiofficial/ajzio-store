 "use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type P={id:string;name:string;suggestedPrice?:number;minimumSellingPrice?:{customerPaysDelivery?:number;resellerPaysDeliveryInsideDhaka?:number;resellerPaysDeliveryOutsideDhaka?:number}};
type I={product:P;quantity:number};
const money=(n:number)=>`৳${n.toLocaleString("en-BD")}`;
export default function Checkout(){
 const [items,setItems]=useState<I[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [form,setForm]=useState({customerName:"",customerPhone:"",customerAddress:"",customerDivision:"",customerDistrict:"",customerArea:"",customerNote:"",deliveryChargePaidByCustomer:true});
 useEffect(()=>{try{setItems(JSON.parse(localStorage.getItem("ajzio-cart")||"[]"))}catch{}},[]);
 const total=items.reduce((s,i)=>s+(i.product.suggestedPrice||0)*i.quantity,0);
 const set=(k:string,v:string|boolean)=>setForm(f=>({...f,[k]:v}));
 async function place(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");
  if(items.length!==1){setError("Business Koro order API accepts one product per order. Please keep one product in your bag and place separate orders for other products.");setBusy(false);return;}
  const item=items[0];
  try{
   const payload={productId:item.product.id,customerName:form.customerName,customerPhone:form.customerPhone,customerAddress:form.customerAddress,customerDivision:form.customerDivision,customerDistrict:form.customerDistrict,customerArea:form.customerArea,sellingPrice:Number(item.product.suggestedPrice||0),deliveryChargePaidByCustomer:form.deliveryChargePaidByCustomer,...(form.customerNote?{customerNote:form.customerNote}:{})};
   const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Order failed");
   const orderId=data.orderId||data.data?.orderId||data.data?.id||data.id;
   setSuccess(`Your order was submitted. ${orderId?`Order ID: ${orderId}`:"Please save the confirmation shown by the store."}`);
   localStorage.removeItem("ajzio-cart");setItems([]);
  }catch(err){setError(err instanceof Error?err.message:"Order could not be submitted.");}finally{setBusy(false);}
 }
 return <><div className="announcement">SECURE CHECKOUT · AJZIO STORE</div><nav className="nav"><Link href="/" style={{color:"inherit",textDecoration:"none"}}><div className="brand">AJZIO<small>THE ART OF EVERYDAY</small></div></Link><Link href="/cart" className="cartbtn">Back to bag</Link></nav><main className="checkout"><div className="eyebrow">Almost yours</div><h1 className="serif">Checkout</h1>{success?<div className="success">{success}<p><Link href="/track">Track an order</Link></p></div>:!items.length?<div className="empty">Your bag is empty. <Link href="/">Return to store</Link></div>:<><div className="checkoutbox"><b>Order summary</b>{items.map(i=><p key={i.product.id}>{i.product.name} × {i.quantity}<b>{money((i.product.suggestedPrice||0)*i.quantity)}</b></p>)}<p><strong>Product total</strong><strong>{money(total)}</strong></p><p className="muted">Final minimum selling price and delivery rules are validated by Business Koro.</p></div>{error&&<div className="error">{error}</div>}<form onSubmit={place}><div className="formgrid">
 {([["customerName","Full name"],["customerPhone","Bangladesh mobile number"],["customerDivision","Division"],["customerDistrict","District"],["customerArea","Area / Thana"],["customerAddress","Full delivery address"]] as const).map(([k,label])=><div className={`field ${k==="customerAddress"?"full":""}`} key={k}><label>{label} *</label><input required value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={label}/></div>)}
 <div className="field full"><label>Order note (optional)</label><textarea value={form.customerNote} onChange={e=>set("customerNote",e.target.value)} rows={3}/></div>
 </div><label style={{display:"flex",gap:10,fontSize:13,margin:"18px 0"}}><input type="checkbox" checked={form.deliveryChargePaidByCustomer} onChange={e=>set("deliveryChargePaidByCustomer",e.target.checked)}/> I will pay the delivery charge on delivery</label><div className="notice">The current storefront API supports one product per order. This checkout sends the selected product's suggested price; confirm your pricing and delivery settings in Business Koro before going live.</div><button className="submit" disabled={busy}>{busy?"Submitting order…":"Place order"}</button></form></>}</main></>;
}