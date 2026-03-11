import Image from "next/image";
import Link from "next/link";
import React from "react";

function Image_Link_Text({ icon, text, link }) {
	return (
		<div className=" mx-4 flex justify-between text-white">
			<div className="">
				<div className="flex space-x-2 ">
					{icon && <Image
						src={icon}
						alt="team"
						width={28}
						height={28}
					/>}
					<p>{text}</p>
				</div>
			</div>
			<div>
                <Link
                    className="text-xs text-[#3399EF] "
                    href={link}>
					View All
				</Link>
			</div>
		</div>
	);
}

export default Image_Link_Text;
